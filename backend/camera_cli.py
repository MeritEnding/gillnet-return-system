# -*- coding: utf-8 -*-
import sys
import os
import time
import json
import argparse
from ctypes import *

# ==========================================================
# [중요] DLL 경로 강제 지정 (오류 해결 핵심)
# ==========================================================
def add_driver_path():
    # 1. 기본 설치 경로 확인 (64비트 기준)
    possible_paths = [
        r"C:\Program Files (x86)\MVS\Runtime\Win64_x64",  # 기본 경로
        r"C:\Program Files\MVS\Runtime\Win64_x64",        # 다른 경로
        os.path.join(os.environ.get("MVCAM_COMMON_RUNENV", ""), "Runtime", "Win64_x64") # 환경변수
    ]

    added = False
    for path in possible_paths:
        if os.path.exists(path) and os.path.isdir(path):
            try:
                # 파이썬 3.8 이상에서는 이 명령어가 필수입니다.
                if hasattr(os, 'add_dll_directory'):
                    os.add_dll_directory(path)
                
                # 환경 변수에도 추가
                os.environ['PATH'] = path + ";" + os.environ['PATH']
                added = True
                # print(f"DLL Path added: {path}", file=sys.stderr) # 디버그용
                break
            except Exception as e:
                pass
    
    if not added:
        # SDK가 없으면 경고 JSON 출력 후 종료
        pass 

add_driver_path()
# ==========================================================

# --- SDK Import
def get_mv_import_path():
    """MvImport 경로를 찾습니다."""
    mvcam_common_runenv = os.getenv('MVCAM_COMMON_RUNENV')
    if mvcam_common_runenv:
        path = os.path.join(mvcam_common_runenv, "Samples", "Python", "MvImport")
        if os.path.isdir(path):
            return path

    script_dir = os.path.dirname(os.path.abspath(__file__))
    # 경로를 프로젝트 구조에 맞게 수정 (현재 파일 위치 기준)
    # kiosk/B/camera_cli.py 에 있다고 가정 시, 상위로 올라가서 MVS EX 찾기
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..')) 
    user_path = os.path.join(project_root, 'MVS EX', 'Python', 'MvImport')
    
    if os.path.isdir(user_path):
        return user_path
        
    return None

mv_import_path = get_mv_import_path()
if mv_import_path:
    sys.path.append(mv_import_path)

try:
    from MvCameraControl_class import *
except ImportError:
    # 경로 문제나 파일 없음
    print(json.dumps({"success": False, "message": "Failed to import SDK. Please install MVS SDK."}))
    sys.exit(1)
except  Exception as e:
    # DLL 로드 실패 등
    print(json.dumps({"success": False, "message": f"DLL Load Error: {str(e)}. Check MVS SDK installation."}))
    sys.exit(1)

# --- Helper Functions
def decoding_char(ctypes_char_array):
    byte_str = memoryview(ctypes_char_array).tobytes()
    null_index = byte_str.find(b'\x00')
    if null_index != -1:
        byte_str = byte_str[:null_index]
    for encoding in ['gbk', 'utf-8', 'latin-1']:
        try:
            return byte_str.decode(encoding)
        except UnicodeDecodeError:
            continue
    return byte_str.decode('latin-1', errors='replace')

def output_json(data):
    print(json.dumps(data, indent=4))

def output_error(message):
    print(json.dumps({"success": False, "message": message}), file=sys.stderr)
    sys.exit(1)

# --- Command Functions
def list_devices():
    try:
        MvCamera.MV_CC_Initialize()
        deviceList = MV_CC_DEVICE_INFO_LIST()
        tlayerType = MV_GIGE_DEVICE | MV_USB_DEVICE
        ret = MvCamera.MV_CC_EnumDevices(tlayerType, deviceList)
        if ret != 0:
            raise Exception("Enum devices fail! ret[0x{:x}]".format(ret))

        devices = []
        for i in range(deviceList.nDeviceNum):
            mvcc_dev_info = cast(deviceList.pDeviceInfo[i], POINTER(MV_CC_DEVICE_INFO)).contents
            if mvcc_dev_info.nTLayerType == MV_GIGE_DEVICE:
                display_name = "GIGE: {}".format(decoding_char(mvcc_dev_info.SpecialInfo.stGigEInfo.chModelName))
            elif mvcc_dev_info.nTLayerType == MV_USB_DEVICE:
                display_name = "USB: {}".format(decoding_char(mvcc_dev_info.SpecialInfo.stUsb3VInfo.chModelName))
            else:
                display_name = "Unknown Device"
            devices.append({"index": i, "display_name": display_name})
        
        output_json(devices)
        MvCamera.MV_CC_Finalize()
    except Exception as e:
        output_error(str(e))

def capture_image(device_index):
    cam = MvCamera()
    try:
        MvCamera.MV_CC_Initialize()
        deviceList = MV_CC_DEVICE_INFO_LIST()
        ret = MvCamera.MV_CC_EnumDevices(MV_GIGE_DEVICE | MV_USB_DEVICE, deviceList)
        
        if not (0 <= device_index < deviceList.nDeviceNum):
            raise Exception("Device index out of bounds")

        stDeviceList = cast(deviceList.pDeviceInfo[device_index], POINTER(MV_CC_DEVICE_INFO)).contents
        ret = cam.MV_CC_CreateHandle(stDeviceList)
        if ret != 0: raise Exception(f"Create handle fail: {hex(ret)}")

        ret = cam.MV_CC_OpenDevice(MV_ACCESS_Exclusive, 0)
        if ret != 0: raise Exception(f"Open device fail: {hex(ret)}")

        # Create capture directory
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captures")
        if not os.path.exists(output_dir): 
            os.makedirs(output_dir)

        # Settings
        cam.MV_CC_SetEnumValue("TriggerMode", MV_TRIGGER_MODE_OFF)
        cam.MV_CC_StartGrabbing()

        stOutFrame = MV_FRAME_OUT()
        memset(byref(stOutFrame), 0, sizeof(stOutFrame))
        ret = cam.MV_CC_GetImageBuffer(stOutFrame, 2000)
        
        if ret != 0:
            cam.MV_CC_StopGrabbing()
            raise Exception(f"Get image buffer fail: {hex(ret)}")

        filename = "capture_{}.jpg".format(int(time.time()))
        filepath = os.path.join(output_dir, filename)

        stSaveParam = MV_SAVE_IMAGE_TO_FILE_PARAM_EX()
        stSaveParam.enPixelType = stOutFrame.stFrameInfo.enPixelType
        stSaveParam.nWidth = stOutFrame.stFrameInfo.nWidth
        stSaveParam.nHeight = stOutFrame.stFrameInfo.nHeight
        stSaveParam.nDataLen = stOutFrame.stFrameInfo.nFrameLen
        stSaveParam.pData = stOutFrame.pBufAddr
        stSaveParam.enImageType = MV_Image_Jpeg
        stSaveParam.pcImagePath = create_string_buffer(filepath.encode('utf-8')) # utf-8 encoding path
        stSaveParam.nQuality = 90
        
        ret = cam.MV_CC_SaveImageToFileEx(stSaveParam)
        
        cam.MV_CC_FreeImageBuffer(stOutFrame)
        cam.MV_CC_StopGrabbing()

        if ret != 0:
            raise Exception(f"Save image fail: {hex(ret)}")
        
        output_json({"success": True, "imagePath": os.path.abspath(filepath)})

    except Exception as e:
        output_error(str(e))
    finally:
        if cam.handle:
            cam.MV_CC_CloseDevice()
            cam.MV_CC_DestroyHandle()
        MvCamera.MV_CC_Finalize()

# --- Main Execution
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list-devices")
    
    cap_parser = subparsers.add_parser("capture")
    cap_parser.add_argument("--device-index", type=int, required=True)

    args = parser.parse_args()

    if args.command == "list-devices":
        list_devices()
    elif args.command == "capture":
        capture_image(args.device_index)