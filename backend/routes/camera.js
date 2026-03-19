const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const { SerialPort } = require('serialport');
const { WebSocketServer } = require('ws');

const router = express.Router();

// --- Helper function to run the camera CLI script ---
function runPythonScript(args) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, '..', 'camera_cli.py');
        const pythonProcess = spawn('python', [pythonScript, ...args]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                try {
                    const errorJson = JSON.parse(stderr);
                    return reject({ status: 500, ...errorJson });
                } catch (e) {
                    return reject({ status: 500, message: stderr || 'Python script failed with exit code ' + code });
                }
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (e) {
                reject({ status: 500, message: 'Failed to parse python script output.', error: stdout });
            }
        });
    });
}


// --- Light Control ---
const LIGHT_CONTROLLER_PORT = 'COM4'; // Make sure this is the correct port
const LIGHT_CONTROLLER_BAUD_RATE = 9600;

function sendLightCommand(commandString) {
    return new Promise((resolve, reject) => {
        const port = new SerialPort({ path: LIGHT_CONTROLLER_PORT, baudRate: LIGHT_CONTROLLER_BAUD_RATE });
        let response = '';
        
        port.on('open', () => {
            port.write(commandString, (err) => {
                if (err) {
                    port.close();
                    return reject({ status: 500, message: `Error sending command: ${err.message}` });
                }
            });
        });

        port.on('data', (data) => { response += data.toString().trim(); });
        port.on('error', (err) => { reject({ status: 500, message: `Serial port error: ${err.message}` }); });
        port.on('close', () => { resolve(response || "Command sent, no response."); });
        setTimeout(() => { if (port.isOpen) port.close(); }, 2000);
    });
}


// --- API Routes ---

// List all available devices
router.get('/devices', async (req, res) => {
    try {
        const devices = await runPythonScript(['list-devices']);
        res.json(devices);
    } catch (error) {
        res.status(error.status || 500).json(error);
    }
});

// Capture an image from a specific device
router.post('/devices/:index/capture', async (req, res) => {
    const { index } = req.params;
    const TURN_ON_COMMAND = '$1100014\r';
    const TURN_OFF_COMMAND = '$2100017\r';

    try {
        await sendLightCommand(TURN_ON_COMMAND);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Shorter wait time

        const result = await runPythonScript(['capture', '--device-index', index]);
        if (result.success && result.imagePath) {
            result.imageUrl = `/captures/${path.basename(result.imagePath)}`;
        }
        res.json(result);

        setTimeout(async () => {
            try {
                await sendLightCommand(TURN_OFF_COMMAND);
            } catch (lightError) {
                console.error('Failed to turn off light after capture:', lightError);
            }
        }, 2000);

    } catch (error) {
        console.error('An error occurred during the capture process:', error);
        res.status(error.status || 500).json(error);
        try {
            await sendLightCommand(TURN_OFF_COMMAND);
        } catch (lightError) {
            console.error('Failed to turn off light after capture error:', lightError);
        }
    }
});

// --- WebSocket Streaming Logic ---
const initializeWebSocket = (server) => {
    const wss = new WebSocketServer({ server });
    console.log('WebSocket Server initialized.');

    wss.on('connection', (ws, req) => {
        let pythonProcess = null;
        let buffer = '';

        // Only handle requests to the designated stream path
        if (req.url.startsWith('/ws/camera-stream')) {
            console.log('Client connected to camera stream.');

            const url = new URL(req.url, `http://${req.headers.host}`);
            const deviceIndex = url.searchParams.get('device-index') || '0';

            const args = [
                '--device-index', deviceIndex,
                '--width', '800', 
                '--height', '600' 
            ];
            
            pythonProcess = spawn('python', [path.join(__dirname, '..', 'camera_stream.py'), ...args]);

            pythonProcess.stdout.on('data', (data) => {
                buffer += data.toString();
                let startIdx, endIdx;
                
                // Process all complete frames in the buffer
                while ((startIdx = buffer.indexOf('FRAME_START')) !== -1 && (endIdx = buffer.indexOf('FRAME_END')) !== -1) {
                    const frame = buffer.substring(startIdx + 'FRAME_START'.length, endIdx);
                    
                    if (ws.readyState === ws.OPEN) {
                        ws.send(JSON.stringify({ type: 'frame', data: 'data:image/jpeg;base64,' + frame }));
                    }
                    
                    // Remove the processed frame from the buffer
                    buffer = buffer.substring(endIdx + 'FRAME_END'.length);
                }
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`[camera_stream.py]: ${data.toString()}`);
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', message: data.toString() }));
                }
            });
        }

        ws.on('close', () => {
            console.log('Client disconnected.');
            if (pythonProcess) {
                pythonProcess.kill();
                pythonProcess = null;
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            if (pythonProcess) {
                pythonProcess.kill();
                pythonProcess = null;
            }
        });
    });
};

module.exports = { router, initializeWebSocket };
