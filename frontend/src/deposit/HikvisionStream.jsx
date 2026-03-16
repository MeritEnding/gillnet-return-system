import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './HikvisionStream.css'; 

const WEBSOCKET_URL = `ws://localhost:8080/ws/camera-stream`;

function HikvisionStream({ deviceIndex, width, height }) {
    const [frame, setFrame] = useState(null);
    const [status, setStatus] = useState('연결 중...');
    const ws = useRef(null);

    useEffect(() => {
        const url = `${WEBSOCKET_URL}?device-index=${deviceIndex}`;
        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            console.log('Camera stream connected.');
            setStatus('연결됨');
        };

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'frame' && message.data) {
                    setFrame(message.data);
                    setStatus('연결됨'); 
                } else if (message.type === 'error') {
                    // ★ 파이썬 카메라 스크립트의 단순 안내(info) 메시지는 에러 화면으로 처리하지 않음
                    if (message.message && message.message.includes('info:')) {
                        console.log('Camera Info:', message.message);
                    } else {
                        console.error('Error from camera stream:', message.message);
                        setStatus('오류 발생');
                    }
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setStatus('연결 문제 발생'); 
        };

        ws.current.onclose = () => {
            console.log('Camera stream disconnected.');
            setStatus('연결 끊김');
        };

        return () => {
            if (ws.current) {
                // 웹소켓 연결 중이거나 열려있을 때만 안전하게 닫기
                if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
                    ws.current.close();
                }
            }
        };
    }, [deviceIndex]);

    return (
        <div className="hikvision-stream-container" style={{ width, height, backgroundColor: '#000', position: 'relative' }}>
            {frame ? (
                <img src={frame} alt="HIKVISION Camera Stream" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <div style={{ color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    {status}
                </div>
            )}
        </div>
    );
}

HikvisionStream.propTypes = {
    deviceIndex: PropTypes.number,
    width: PropTypes.string,
    height: PropTypes.string,
};

HikvisionStream.defaultProps = {
    deviceIndex: 0,
    width: '100%',
    height: '100%',
};

export default HikvisionStream;