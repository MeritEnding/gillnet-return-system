// src/depositPage/DepositScreen.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // ★ 다국어 훅 적용
import axios from 'axios';

import './DepositScreen.css';
import LoadingSpinner from '../assets/loading-spinner.png';
import DepositGuideVideo from '../assets/어구 반납.mp4';
import ReturnCompleteVideo from '../assets/어구반납완료.mp4';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';

const urlToBlob = async (url) => {
  const response = await fetch(url);
  return await response.blob();
};

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LoadingOverlay = ({ text }) => {
  const { t } = useTranslation();
  return (
    <div className="deposit-overlay">
      <div className="loading-column">
        <img src={LoadingSpinner} alt="loading" className="deposit-spinner large" />
        <p className="loading-text">{text || t('deposit_loading_default') || "처리 중입니다..."}</p>
      </div>
    </div>
  );
};

const SafetyWarningIcon = () => (
  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#DC3545" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DepositScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(); // ★ 번역 함수 선언

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [viewState, setViewState] = useState('DEPOSITING');

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [depositSubState, setDepositSubState] = useState('READY_CAPTURE');

  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isDoorClosed, setIsDoorClosed] = useState(false);

  // ★ 하드웨어 에러 방지용 테스트 모드 플래그
  const [isTestMode, setIsTestMode] = useState(false);

  const [scannedGears, setScannedGears] = useState([]);
  const [scannedList, setScannedList] = useState([]);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [totalPoint, setTotalPoint] = useState(0);

  const [showSafetyWarning, setShowSafetyWarning] = useState(false);

  const [capturedImages, setCapturedImages] = useState([]);
  const [returnMngNos, setReturnMngNos] = useState({ remg: '', romg: '' });

  const LOCAL_API_URL = 'http://localhost:8080';
  const PROXY_API_URL = 'http://localhost:8080/api/v1/proxy';

  const showMessage = (msg, isErr = false) => {
    setStatusMessage(msg);
    setIsError(isErr);
  };

  useEffect(() => {
    axios.post(`${LOCAL_API_URL}/api/deposit/init`).catch(() => console.log("하드웨어 초기화 건너뜀 (테스트 환경)"));
  }, []);

  useEffect(() => {
    const gears = location.state?.scannedGears;
    if (gears && gears.length > 0) {
      setScannedGears(gears);
    } else {
      showMessage(t('deposit_alert_no_items') || "스캔된 어구가 없습니다.", true);
    }
  }, [location.state, t]);

  const handleBack = () => {
    if (viewState === 'CONFIRMING') {
      setViewState('DEPOSITING');
      setScannedList([]);
      setStatusMessage('');
      setIsDoorClosed(false);
      setDepositSubState('READY_CAPTURE');
      setCurrentItemIndex(0);
      setCapturedImages([]);
      setIsTestMode(false);
    } else {
      navigate(-1);
    }
  };

  // 실제 카메라 촬영
  const handleCapture = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setStatusMessage('');

    try {
      setLoadingText(t('deposit_msg_capture_loading') || "카메라 촬영 중입니다...");
      const captureRes = await axios.post(`${LOCAL_API_URL}/api/camera/devices/0/capture`);
      if (!captureRes.data.success) throw new Error(t('deposit_msg_capture_fail') || "로컬 카메라 촬영에 실패했습니다.");

      const localImageUrl = `${LOCAL_API_URL}${captureRes.data.imageUrl}`;
      const imageBlob = await urlToBlob(localImageUrl);
      const imageFile = new File([imageBlob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });

      setCapturedImages(prev => [...prev, imageFile]);
      setDepositSubState('WAITING_CLOSE');
      showMessage(t('deposit_msg_capture_success') || "어구가 확인되었습니다. [투입구 닫기] 버튼을 눌러주세요.");

    } catch (error) {
      showMessage(t('deposit_msg_cam_error') || `카메라 연결 오류. [건너뛰기] 버튼을 사용해주세요.`, true);
    } finally {
      setIsLoading(false);
    }
  };

  // ★ 테스트 모드 전용 건너뛰기
  const handleSkipCapture = () => {
    if (isLoading) return;
    setIsTestMode(true); // 이후 하드웨어 통신 전면 차단

    const dummyBlob = new Blob(["dummy image data"], { type: "image/jpeg" });
    const dummyFile = new File([dummyBlob], `dummy_capture_${Date.now()}.jpg`, { type: "image/jpeg" });

    setCapturedImages(prev => [...prev, dummyFile]);
    setDepositSubState('WAITING_CLOSE');
    showMessage(t('deposit_msg_skip_test') || "[테스트 모드] 촬영을 건너뛰었습니다. [투입구 닫힘]을 눌러주세요.");
  };

  const handleCloseAndRunConveyor = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // 안전 경고 켜고 음성 재생
    setShowSafetyWarning(true);
    speakSafetyWarning();

    if (isTestMode) {
      setLoadingText(t('deposit_msg_conveyor_test') || "테스트 모드: 하드웨어 제어 건너뛰는 중...");
      await new Promise(res => setTimeout(res, 2000)); // 경고를 볼 수 있도록 대기 시간 늘림
    } else {
      setLoadingText(t('deposit_msg_conveyor_run') || "어구를 처리하고 컨베이어를 작동합니다... (8초)");
      try {
        await axios.post(`${LOCAL_API_URL}/api/deposit/action/close-doors`, { isLast: false });
        await axios.post(`${LOCAL_API_URL}/api/deposit/action/conveyor`);
        await new Promise(resolve => setTimeout(resolve, 8000));
      } catch (hwError) {
        console.log("하드웨어 통신 에러 무시");
      }
    }
    // 동작이 끝나면 안전 경고 끄기
    setShowSafetyWarning(false);

    try {
      const nextIndex = currentItemIndex + 1;
      const isLastItem = nextIndex >= scannedGears.length;

      if (!isLastItem) {
        if (!isTestMode) try { await axios.post(`${LOCAL_API_URL}/api/deposit/init`); } catch (e) { }
        setCurrentItemIndex(nextIndex);
        setDepositSubState('READY_CAPTURE');
        showMessage(t('deposit_msg_next_capture', { next: nextIndex + 1 }) || `다음 ${nextIndex + 1}번째 어구를 위해 촬영 버튼을 눌러주세요.`);
        setIsLoading(false);
      } else {
        await handleProcessScans();
      }
    } catch (error) {
      showMessage(t('deposit_msg_process_err') || "처리 중 오류가 발생했습니다. 다시 시도해주세요.", true);
      setIsLoading(false);
    }
  };
  
  const speakSafetyWarning = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // 기존 음성 취소
      const utterance = new SpeechSynthesisUtterance(t('deposit_msg_safety_voice') || "위험하오니 한 걸음 뒤로 물러서 주세요. 투입구가 닫힙니다.");
      utterance.lang = 'ko-KR'; // 로직 유지를 위해 한국어 코드는 유지합니다 (단, 번역된 텍스트가 전달됨)
      utterance.rate = 1.0; // 말하기 속도
      window.speechSynthesis.speak(utterance);
    }
  };

  // 1. [추가] 컴포넌트 내부(또는 바깥)에 포맷 변환 함수 추가
  const formatPhone = (phone) => {
    if (!phone) return "010-0000-0000"; // 데이터가 없을 때 백엔드 에러 방지용
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`; // 010-1234-5678 형식
    return phone;
  };

  const formatBrdt = (brdt) => {
    if (!brdt) return "1990-01-01"; // PASS에서 생년월일을 안 줬을 때 방어용
    const cleaned = ('' + brdt).replace(/\D/g, '');
    if (cleaned.length === 8) {
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
    }
    return brdt;
  };

  const handleProcessScans = async () => {
    setIsLoading(true);
    setLoadingText(t('deposit_msg_server_upload') || "반환 정보를 서버에 등록하는 중입니다...");
    const mbrNo = localStorage.getItem('mbr_no') || '';
    const isMember = localStorage.getItem('is_member') === 'true';
    const fishermanId = localStorage.getItem('fisherman_id');
    const fishermanName = localStorage.getItem('fisherman_name') || '비회원';
   
    // 저장된 사용자/계좌 정보 가져오기 (null 에러 방지 처리)
    const rawPhone = localStorage.getItem('fisherman_phone') || localStorage.getItem('mbl_telno');
    const rawBrdt = localStorage.getItem('brdt') || localStorage.getItem('birthdate');
    const bankCd = localStorage.getItem('bank_cd') || '';
    const actno = localStorage.getItem('actno') || ''; 
    const acctNm = localStorage.getItem('acct_nm') || fishermanName;
    const selectedClsfCd = localStorage.getItem('selected_fsgr_clsf_cd') || 'FISGE';

    const commonPayload = {
      user_fshnd_no: fishermanId === 'NON_MEMBER' ? '' : fishermanId,
      fsgr_clsf_cd: selectedClsfCd,
      korn_flnm: fishermanName,
      brdt: formatBrdt(rawBrdt),
      telno: formatPhone(rawPhone),
      mbl_telno: formatPhone(rawPhone),
      bank_cd: bankCd,
      actno: actno.replace(/-/g, ''), // null 방지 적용 완료
      acct_nm: acctNm,
      kiosk_no: "K001",
      mbr_no: mbrNo
    };

    if (isMember && fishermanId && fishermanId !== 'NON_MEMBER') {
      commonPayload.user_fshnd_no = fishermanId;
    }

    const depositGears = scannedGears.filter(g => g.gvbk_type.includes('보증금'));
    const existingGears = scannedGears.filter(g => g.gvbk_type.includes('기존'));

    let remgMngNo = '';
    let finalRemgMngNo = '';
    let romgMngNo = '';
    const successfulReturns = [];
    let calcDeposit = 0;
    let calcPoint = 0;

    try {
      // 2. 보증금 어구(REMG) 반환 시작 
      if (depositGears.length > 0) {
        const remgPayload = {
          ...commonPayload,
          telno: formatPhone(rawPhone),
          fsgr_clsf_cd: selectedClsfCd,
          kiosk_no: "KIOSK-001"
        };

        const startRes = await axios.post(`${PROXY_API_URL}/deposit/return/remg/start`, remgPayload);

        if (startRes.data?.status === "400" || startRes.data?.status === "500" || startRes.data?.status === 400) {
          throw new Error(`${t('deposit_err_start_remg') || '[보증금어구 시작 거부]'} ${startRes.data?.message}`);
        }

        remgMngNo = startRes.data?.data?.gvbk_mng_no;
        finalRemgMngNo = remgMngNo;

        if (remgMngNo) {
          // ★ for문 대신 Promise.all 사용: 모든 바코드를 한 번에 쏴서 처리 속도 10배 상승!
          const remgPromises = depositGears.map(gear => 
            axios.post(`${PROXY_API_URL}/deposit/return/remg`, {
              bacod_nm: gear.bacod_nm,
              gvbk_mng_no: remgMngNo
            }).then(retRes => {
              if (retRes.data?.status === "200" || retRes.data?.status === 200 || retRes.data?.message === "OK") {
                return { success: true, gear, mngNo: retRes.data.data?.gvbk_mng_no };
              } else {
                throw new Error(`${t('deposit_err_register') || '[등록 거부]'} ${retRes.data?.message}`);
              }
            })
          );
          
          const remgResults = await Promise.all(remgPromises);
          remgResults.forEach(res => {
            const realAmount = res.gear.gvbk_amt || 0;
            successfulReturns.push({ code: res.gear.bacod_nm, type: '보증금어구', reward: realAmount, point: 0 });
            calcDeposit += realAmount;
            if (res.mngNo) finalRemgMngNo = res.mngNo;
          });
        }
      }

      // 3. 기존 어구(ROMG) 반환 시작 (회원 전용)
      if (existingGears.length > 0 && isMember) {
        const romgPayload = {
          ...commonPayload,
          telno: formatPhone(rawPhone),
          kiosk_no: "KIOSK-001"
        };

        const startRes = await axios.post(`${PROXY_API_URL}/deposit/return/romg/start`, romgPayload);

        if (startRes.data?.status === "400" || startRes.data?.status === "500") {
          throw new Error(`${t('deposit_err_start_romg') || '[기존어구 시작 거부]'} ${startRes.data?.message}`);
        }

        romgMngNo = startRes.data?.data?.bfr_fsgr_gvbk_no;

        if (romgMngNo) {
          // ★ 여기도 Promise.all 로 속도 대폭 개선
          const romgPromises = existingGears.map(gear => 
            axios.post(`${PROXY_API_URL}/deposit/return/romg`, {
              bacod_nm: gear.bacod_nm,
              bfr_fsgr_gvbk_no: romgMngNo
            }).then(retRes => {
              if (retRes.data?.status === "200" || retRes.data?.status === 200 || retRes.data?.message === "OK") {
                return { success: true, gear };
              } else {
                throw new Error(`${t('deposit_err_register') || '[등록 거부]'} ${retRes.data?.message}`);
              }
            })
          );
          
          const romgResults = await Promise.all(romgPromises);
          romgResults.forEach(res => {
            const realPoint = res.gear.gvbk_pnt || 0;
            successfulReturns.push({ code: res.gear.bacod_nm, type: '기존어구', reward: 0, point: realPoint });
            calcPoint += realPoint;
          });
        }
      }

      setReturnMngNos({ remg: finalRemgMngNo, romg: romgMngNo });

      if (successfulReturns.length === 0) {
        throw new Error(t('deposit_err_no_normal') || "정상적으로 등록된 어구가 없습니다.");
      }

      setScannedList(successfulReturns);
      setTotalDeposit(calcDeposit);
      setTotalPoint(calcPoint);
      setViewState('CONFIRMING');

    } catch (err) {
      console.error("API 처리 에러 상세:", err);
      const backendErrorMsg = err.response?.data?.message || err.message;
      
      // ★ 멈춤의 주범이었던 alert()를 삭제하고 내부 알림 함수로 변경했습니다!
      showMessage(`${t('deposit_err_server_comm') || '서버 통신 오류:'} ${backendErrorMsg}`, true);
      
      // 에러 났을 때 화면이 멈추지 않고 다시 버튼을 누를 수 있게 상태 복구
      setViewState('DEPOSITING');
      setDepositSubState('READY_CAPTURE');
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDoors = async () => {
    setIsLoading(true);
    setLoadingText(t('deposit_msg_closing_door') || "투입구를 닫고 있습니다...");

    setShowSafetyWarning(true);
    speakSafetyWarning();

    try {
      if (!isTestMode) await axios.post(`${LOCAL_API_URL}/api/deposit/action/close-doors`, { isLast: true });
      await new Promise(res => setTimeout(res, 2500)); // 문 닫히는 동안 경고 유지
      setIsDoorClosed(true);
      showMessage(t('deposit_msg_door_closed') || "투입구가 닫혔습니다. 확인 완료를 눌러주세요.");
    } catch (e) {
      setIsDoorClosed(true);
      showMessage(t('deposit_msg_door_closed_test') || "테스트: 투입구 닫힘 처리 완료", true);
    } finally {
      setIsLoading(false);
      // ★ 동작이 끝나면 안전 경고 끄기
      setShowSafetyWarning(false);
    }
  };

  const handleFinalConfirm = async () => {
    setIsLoading(true);
    setLoadingText(t('deposit_msg_final_upload') || "데이터를 서버로 전송 중입니다...");

    try {
      if (capturedImages.length > 0) {
        // ==========================================
        // 1. 보증금 어구 (REMG) 처리
        // ==========================================
        if (returnMngNos.remg) {
          console.log("🚨 [문자 전송 전 확인] 날아가는 ID:", returnMngNos.remg);

          // [사진 전송 블록] - 실패해도 아래로 넘어감
          try {
            const formRemg = new FormData();
            formRemg.append('gvbk_mng_no', returnMngNos.remg);
            capturedImages.forEach(file => formRemg.append('files', file));
            await axios.post(`${PROXY_API_URL}/deposit/image/remg.json`, formRemg, { headers: { 'Content-Type': 'multipart/form-data' } });
          } catch (imgError) {
            console.warn("⚠️ 보증금어구 사진 전송 실패 (무시하고 문자 전송 진행):", imgError.message);
          }

          // [문자 전송 블록] - 사진이 실패해도 무조건 실행됨!
          try {
            await axios.post(`${PROXY_API_URL}/deposit/return/remg/sms.json`, { gvbk_mng_no: returnMngNos.remg });
            console.log("✅ 보증금어구 문자 발송 성공!");
          } catch (smsError) {
            console.error("❌ 보증금어구 문자 발송 실패:", smsError.response?.data || smsError.message);
          }
        }

        // ==========================================
        // 2. 기존 어구 (ROMG) 처리
        // ==========================================
        if (returnMngNos.romg) {
          // [사진 전송 블록]
          try {
            const formRomg = new FormData();
            formRomg.append('bfr_fsgr_gvbk_no', returnMngNos.romg);
            capturedImages.forEach(file => formRomg.append('files', file));
            await axios.post(`${PROXY_API_URL}/deposit/image/romg.json`, formRomg, { headers: { 'Content-Type': 'multipart/form-data' } });
          } catch (imgError) {
            console.warn("⚠️ 기존어구 사진 전송 실패 (무시하고 문자 전송 진행):", imgError.message);
          }

          // [문자 전송 블록]
          try {
            await axios.post(`${PROXY_API_URL}/deposit/return/romg/sms.json`, { bfr_fsgr_gvbk_no: returnMngNos.romg });
            console.log("✅ 기존어구 문자 발송 성공!");
          } catch (smsError) {
            console.error("❌ 기존어구 문자 발송 실패:", smsError.response?.data || smsError.message);
          }
        }
      }
    } catch (error) {
      console.error("전체 처리 중 알 수 없는 에러:", error);
    } finally {
      setIsLoading(false);
      navigate('/completion', {
        state: { totalDeposit, totalPoint, totalCount: scannedList.length }
      });
    }
  };

  const translateGearType = (type) => {
    const typeStr = String(type);
    // 이전 화면의 뱃지 키를 활용
    if (typeStr.includes('보증금')) return t('gear_badge_deposit') || "보증금어구";
    if (typeStr.includes('기존')) return t('gear_badge_existing') || "기존어구";
    return typeStr;
  };

  return (
    <div className="deposit-wrapper">
      <Header />
      <div className="deposit-body">
        <div className="camera-box">
          <button className="deposit-back-btn" onClick={handleBack} disabled={isLoading}>
            <BackIcon />
            <span className="deposit-back-text">
              {viewState === 'CONFIRMING' ? (t('deposit_btn_prev_step') || '이전 단계') : (t('deposit_btn_prev') || '이전으로')}
            </span>
          </button>

          {viewState === 'DEPOSITING' ? (
            <div className="video-container">
              <video src={DepositGuideVideo} autoPlay loop muted playsInline className="fill-video" />
            </div>
          ) : (
            <video src={ReturnCompleteVideo} autoPlay loop muted playsInline className="fill-video" />
          )}
        </div>

        <div className="deposit-card-container" style={{ backgroundImage: `url(${BgImage})` }}>
          <div className="deposit-info-card">
            <div className="step-tabs">
              <div className="step-tab inactive"><div className="step-num-circle">1</div><span className="step-label">{t('auth_step_1') || '사용자 인증'}</span></div>
              <div className="step-tab inactive"><div className="step-num-circle">2</div><span className="step-label">{t('auth_step_2') || '어구보증금표식 인증'}</span></div>
              <div className="step-tab active"><div className="step-num-circle">3</div><span className="step-label">{t('auth_step_3') || '투입'}</span></div>
            </div>

            <h2 className="step-main-title">{viewState === 'CONFIRMING' ? (t('deposit_step_confirm') || '투입 내역 확인') : (t('deposit_step_3_title') || '3단계: 투입')}</h2>

            {viewState === 'DEPOSITING' && (
              <div className="deposit-content-box">
                <div className="instruction-box">
                  <div style={{ textAlign: 'center', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.2rem', color: '#333' }}>
                    {t('deposit_progress') || '진행 상황'}: {currentItemIndex + 1} / {scannedGears.length}
                  </div>

                  {statusMessage ? (
                    <div className={`status-message-box ${isError ? 'error' : 'success'}`}>
                      <p className="status-text">{statusMessage}</p>
                    </div>
                  ) : (
                    <p className="instruction-text">
                      {depositSubState === 'READY_CAPTURE' ?
                        (t('deposit_inst_ready') || "폐어구를 투입구에 넣고 [투입 확인] 버튼을 눌러주세요.") :
                        (t('deposit_inst_done') || "어구 확인이 완료되었습니다. [투입구 닫기] 버튼을 눌러주세요.")
                      }
                    </p>
                  )}

                  <div className="deposit-action-buttons-row" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                    {depositSubState === 'READY_CAPTURE' ? (
                      <div style={{ display: 'flex', gap: '15px', width: '100%', maxWidth: '400px' }}>
                        <button className="deposit-action-btn primary" onClick={handleCapture} disabled={isLoading} style={{ flex: 1, backgroundColor: '#007BFF' }}>
                          {t('deposit_btn_check') || '투입 확인'}
                        </button>
                        <button
                          className="deposit-action-btn"
                          onClick={handleSkipCapture}
                          disabled={isLoading}
                          style={{ flex: 1, backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.3rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {t('deposit_btn_skip') || '건너뛰기(테스트)'}
                        </button>
                      </div>
                    ) : (
                      <button className="deposit-action-btn primary" onClick={handleCloseAndRunConveyor} disabled={isLoading} style={{ width: '100%', maxWidth: '300px', backgroundColor: '#28a745' }}>
                        {t('deposit_btn_door_closed') || '투입구 닫힘'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {viewState === 'CONFIRMING' && (
              <div className="deposit-content-box" style={{ display: 'block', width: '100%' }}>
                <div className="deposit-table-scroll-wrapper">
                  <table className="deposit-table">
                    <thead>
                      <tr>
                        <th>{t('deposit_tbl_code') || '코드'}</th>
                        <th>{t('deposit_tbl_type') || '유형'}</th>
                        <th>{t('deposit_tbl_amt') || '금액/포인트'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedList.map((item, index) => (
                        <tr key={index}>
                          <td>{item.code}</td>
                          <td>{translateGearType(item.type)}</td>
                          <td>{item.point > 0 ? `${item.point.toLocaleString()} P` : `${item.reward.toLocaleString()} ${t('currency_unit') || '원'}`}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2">{t('deposit_tbl_total') || '총계'}</td>
                        <td>
                          {totalDeposit > 0 && <span>{totalDeposit.toLocaleString()} {t('currency_unit') || '원'}</span>}
                          {totalDeposit > 0 && totalPoint > 0 && <span style={{ margin: '0 5px' }}>/</span>}
                          {totalPoint > 0 && <span>{totalPoint.toLocaleString()} P</span>}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {!isDoorClosed && (
                  <p style={{ textAlign: 'center', color: '#d9534f', fontWeight: 'bold', fontSize: '1.1rem', margin: '15px 0 5px 0' }}>
                    {t('deposit_notice_scanner') || '※ 바코드 스캐너를 잘 정리해주시고 투입구를 닫아주세요.'}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px', justifyContent: 'center' }}>
                  <button
                    className="deposit-confirm-btn"
                    style={{ backgroundColor: isDoorClosed ? '#6c757d' : '#ffc107', color: isDoorClosed ? '#fff' : '#000', flex: 1 }}
                    onClick={handleCloseDoors} disabled={isLoading}
                  >
                    {isDoorClosed ? (t('deposit_btn_door_closed') || "투입구 닫힘") : (t('deposit_btn_close_door') || "투입구 닫기")}
                  </button>
                  <button
                    className="deposit-confirm-btn"
                    style={{ backgroundColor: isDoorClosed ? '#28a745' : '#ccc', cursor: isDoorClosed ? 'pointer' : 'not-allowed', flex: 1 }}
                    onClick={handleFinalConfirm} disabled={isLoading || !isDoorClosed}
                  >
                    {t('deposit_btn_final_confirm') || '확인 완료'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {isLoading && <LoadingOverlay text={loadingText} />}

      {showSafetyWarning && (
        <div className="safety-warning-overlay">
          <div className="safety-warning-box">
            <SafetyWarningIcon />
            <h1 className="safety-warning-title">{t('deposit_warn_title') || '위험! 투입구 작동 중'}</h1>
            <p className="safety-warning-text">
              {t('deposit_warn_desc_1') || '안전을 위해 한 걸음'}<br />
              {t('deposit_warn_desc_2') || '뒤로 '}<strong>{t('deposit_warn_desc_3') || '물러서 주세요!'}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositScreen;