# -*- coding: utf-8 -*-
import sys
import os
import time
import json
import argparse
import base64
from ctypes import *

# --- SDK Import (Copied and adapted from camera_cli.py)
def get_mv_import_path():
    """Dynamically find the path to MvImport."""
    mvcam_common_runenv = os.getenv('MVCAM_COMMON_RUNENV')
    if mvcam_common_runenv:
        path = os.path.join(mvcam_common_runenv, "Samples", "Python", "MvImport")
        if os.path.isdir(path):
            return path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
    user_path = os.path.join(project_root, 'MVS EX', 'Python', 'MvImport')
    if os.path.isdir(user_path):
        return user_path
    return None

mv_import_path = get_mv_import_path()
if mv_import_path:
    sys.path.append(mv_import_path)
else:
    print(json.dumps({"success": False, "message": "MvImport directory not found."}, file=sys.stderr))
    sys.exit(1)

try:
    from MvCameraControl_class import *
except ImportError:
    print(json.dumps({"success": False, "message": "Failed to import MvCameraControl_class."}, file=sys.stderr))
    sys.exit(1)


# --- Streaming Callback ---

class CallbackData(Structure):
    _fields_ = [
        ("cam", py_object),       # MvCamera 객체를 직접 저장
        ("image_buffer", c_void_p),
        ("buffer_size", c_uint)
    ]


# RegisterImageCallBackEx 는 보통 (pData, pFrameInfo, pUser) 형태로 들어옵니다.
def image_callback(pData, pFrameInfo, pUser):
    if not pFrameInfo or not pUser:
        return

    frame_info = pFrameInfo.contents
    callback_data = cast(pUser, POINTER(CallbackData)).contents

    cam = callback_data.cam

    # 구조체 호환
    if "MV_SAVE_IMAGE_TO_MEM_PARAM_EX" in globals():
        stSaveParam = MV_SAVE_IMAGE_TO_MEM_PARAM_EX()
    elif "MV_SAVE_IMAGE_TO_MEM_PARAM" in globals():
        stSaveParam = MV_SAVE_IMAGE_TO_MEM_PARAM()
    else:
        return  # 이 SDK는 해당 구조체가 없음

    stSaveParam.enPixelType = frame_info.enPixelType
    stSaveParam.nWidth = frame_info.nWidth
    stSaveParam.nHeight = frame_info.nHeight
    stSaveParam.nDataLen = frame_info.nFrameLen
    stSaveParam.pData = pData
    stSaveParam.enImageType = MV_Image_Jpeg
    stSaveParam.nQuality = 70
    stSaveParam.pImageBuffer = callback_data.image_buffer
    stSaveParam.nBufferSize = callback_data.buffer_size
    stSaveParam.nJpgImageSize = 0

    # 함수 호환
    if hasattr(cam, "MV_CC_SaveImageToMemEx"):
        ret = cam.MV_CC_SaveImageToMemEx(stSaveParam)
    elif hasattr(cam, "MV_CC_SaveImageToMem"):
        ret = cam.MV_CC_SaveImageToMem(stSaveParam)
    else:
        return

    if ret == MV_OK and stSaveParam.nJpgImageSize > 0:
        jpeg_data = string_at(callback_data.image_buffer, stSaveParam.nJpgImageSize)
        base64_str = base64.b64encode(jpeg_data).decode('utf-8')
        sys.stdout.write("FRAME_START" + base64_str + "FRAME_END\n")
        sys.stdout.flush()
    """
    Called for each frame.
    Converts to JPEG in memory -> base64 -> prints to stdout.
    """
    if not pFrameInfo or not pUser:
        return

    frame_info = pFrameInfo.contents
    callback_data = cast(pUser, POINTER(CallbackData)).contents

    # pData: raw image pointer (unsigned char*)
    # frame_info: MV_FRAME_OUT_INFO_EX
    stSaveParam = MV_SAVE_IMAGE_TO_MEM_PARAM_EX()
    stSaveParam.enPixelType = frame_info.enPixelType
    stSaveParam.nWidth = frame_info.nWidth
    stSaveParam.nHeight = frame_info.nHeight
    stSaveParam.nDataLen = frame_info.nFrameLen
    stSaveParam.pData = pData
    stSaveParam.enImageType = MV_Image_Jpeg
    stSaveParam.nQuality = 70
    stSaveParam.pImageBuffer = callback_data.image_buffer
    stSaveParam.nBufferSize = callback_data.buffer_size
    stSaveParam.nJpgImageSize = 0

    cam = callback_data.cam  # 여기서 cam은 MvCamera 객체
    ret = cam.MV_CC_SaveImageToMemEx(stSaveParam)

    if ret == MV_OK and stSaveParam.nJpgImageSize > 0:
        jpeg_data = string_at(callback_data.image_buffer, stSaveParam.nJpgImageSize)
        base64_str = base64.b64encode(jpeg_data).decode('utf-8')
        sys.stdout.write("FRAME_START" + base64_str + "FRAME_END\n")
        sys.stdout.flush()
    # 실패해도 조용히 넘어가서 스트림 유지


def main(device_index, width, height):
    cam = MvCamera()

    # Initialize SDK
    MvCamera.MV_CC_Initialize()

    # Enumerate devices
    deviceList = MV_CC_DEVICE_INFO_LIST()
    ret = MvCamera.MV_CC_EnumDevices(MV_GIGE_DEVICE | MV_USB_DEVICE, deviceList)
    if ret != MV_OK:
        print(json.dumps({"success": False, "message": f"EnumDevices failed: {ret}"}), file=sys.stderr)
        sys.exit(1)

    if not (0 <= device_index < deviceList.nDeviceNum):
        print(json.dumps({"success": False, "message": f"Device index {device_index} is out of bounds."}), file=sys.stderr)
        sys.exit(1)

    # Create and open device
    stDeviceList = cast(deviceList.pDeviceInfo[device_index], POINTER(MV_CC_DEVICE_INFO)).contents
    ret = cam.MV_CC_CreateHandle(stDeviceList)
    if ret != MV_OK:
        print(json.dumps({"success": False, "message": f"CreateHandle failed: {ret}"}), file=sys.stderr)
        sys.exit(1)

    ret = cam.MV_CC_OpenDevice(MV_ACCESS_Exclusive, 0)
    if ret != MV_OK:
        print(json.dumps({"success": False, "message": f"OpenDevice failed: {ret}"}), file=sys.stderr)
        sys.exit(1)

    # Set trigger mode to OFF for continuous streaming
    cam.MV_CC_SetEnumValue("TriggerMode", MV_TRIGGER_MODE_OFF)

    # Set resolution (optional)
    if width and height:
        cam.MV_CC_SetIntValue("Width", int(width))
        cam.MV_CC_SetIntValue("Height", int(height))

    # ✅ FIX: Get PayloadSize correctly (needs output struct)
    stPayloadSize = MVCC_INTVALUE()
    ret = cam.MV_CC_GetIntValue("PayloadSize", stPayloadSize)
    if ret != MV_OK:
        print(json.dumps({"success": False, "message": f"Get PayloadSize failed: {ret}"}), file=sys.stderr)
        sys.exit(1)

    payload_size = int(stPayloadSize.nCurValue)

    # Allocate a buffer for JPEG conversion
    # JPEG can be larger than raw depending on SDK internals; give headroom
    image_buffer_size = max(payload_size * 2, 1024 * 1024)  # 최소 1MB 보장
    image_buffer = (c_ubyte * image_buffer_size)()

    # Prepare callback data
    callback_data = CallbackData()
    callback_data.cam = cam  # ✅ py_object에 MvCamera를 그대로 넣어야 함
    callback_data.image_buffer = cast(image_buffer, c_void_p)
    callback_data.buffer_size = image_buffer_size

    # Register callback
    # ✅ FIX: callback signature: (unsigned char* pData, MV_FRAME_OUT_INFO_EX* pFrameInfo, void* pUser)
    CALLBACK_FUNC = CFUNCTYPE(None, POINTER(c_ubyte), POINTER(MV_FRAME_OUT_INFO_EX), c_void_p)
    image_callback_func = CALLBACK_FUNC(image_callback)

    # pUser로 callback_data 포인터 전달
    p_callback_data = cast(pointer(callback_data), c_void_p)

    ret = cam.MV_CC_RegisterImageCallBackEx(image_callback_func, p_callback_data)
    if ret != MV_OK:
        print(json.dumps({"success": False, "message": f"RegisterImageCallBackEx failed: {ret}"}), file=sys.stderr)
        sys.exit(1)

    # Start grabbing
    ret = cam.MV_CC_StartGrabbing()
    if ret != MV_OK:
        print(json.dumps({"success": False, "message": f"StartGrabbing failed: {ret}"}), file=sys.stderr)
        sys.exit(1)

    print("info: Camera streaming started. Script will run indefinitely.", file=sys.stderr)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        print("info: Stopping camera stream.", file=sys.stderr)
        cam.MV_CC_StopGrabbing()
        cam.MV_CC_CloseDevice()
        cam.MV_CC_DestroyHandle()
        MvCamera.MV_CC_Finalize()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MVS Camera Real-time Streaming Script")
    parser.add_argument("--device-index", type=int, required=True, help="Index of the camera device.")
    parser.add_argument("--width", type=int, default=640, help="Set camera capture width.")
    parser.add_argument("--height", type=int, default=480, help="Set camera capture height.")
    args = parser.parse_args()

    main(args.device_index, args.width, args.height)
