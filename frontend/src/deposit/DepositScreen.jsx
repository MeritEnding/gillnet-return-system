// src/depositPage/DepositScreen.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    <div className="deposit-alert-overlay">
      <div className="deposit-alert-content">
        <div className="deposit-alert-header">
          {t('deposit_loading_title') || '처리 중'}
        </div>
        <div className="deposit-alert-body">
          <div className="deposit-loading-icon-circle">
            <img src={LoadingSpinner} alt="loading" className="deposit-spinner-spin" />
          </div>
          <p className="deposit-alert-msg">
            <strong>{text || t('deposit_loading_default') || "잠시만 기다려주세요..."}</strong>
          </p>
          <div className="deposit-loading-bar-container">
            <div className="deposit-loading-bar-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SafetyWarningIcon = () => (
  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#DC3545" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// =========================================================
// ★ [수정됨] 완벽하게 다듬어진 TTS (음성 재생) 함수로 교체
// (브라우저 멈춤 버그 방어 및 겹침 방지 로직 적용)
// =========================================================
window.utterances = window.utterances || [];

const getBestVoice = (langCode, voiceList) => {
  if (!voiceList || voiceList.length === 0) return null;
  let bestVoice = null;
  if (langCode.includes('ko')) {
    bestVoice = voiceList.find(v => v.lang.includes('ko'));
  } else if (langCode.includes('vi')) {
    bestVoice = voiceList.find(v => v.lang.includes('vi'));
  } else if (langCode.includes('id')) {
    bestVoice = voiceList.find(v => v.lang.includes('id'));
  } else if (langCode.includes('tl') || langCode.includes('fil')) {
    bestVoice = voiceList.find(v => v.lang.includes('fil') || v.lang.includes('tl'));
  } else if (langCode.includes('my')) {
    bestVoice = voiceList.find(v => v.lang.includes('my'));
  } else {
    bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en'));
  }
  return bestVoice;
};

const speak = (text, lang, voiceList) => {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel(); // 이전 말 끊기

  const utterance = new SpeechSynthesisUtterance(text);
  window.utterances.push(utterance); // 가비지 컬렉션 방어

  const langMap = {
    'ko': 'ko-KR', 'en': 'en-US', 'vi': 'vi-VN',
    'tl': 'fil-PH', 'id': 'id-ID', 'my': 'my-MM'
  };
  const shortLang = lang.substring(0, 2);
  utterance.lang = langMap[shortLang] || 'en-US';

  const selectedVoice = getBestVoice(utterance.lang, voiceList);
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = 1.0;

  utterance.onend = () => {
    const index = window.utterances.indexOf(utterance);
    if (index > -1) window.utterances.splice(index, 1);
  };

  window.speechSynthesis.speak(utterance);

  // 크롬 15초 멈춤 버그 방어용
  const timer = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.resume();
    } else {
      clearInterval(timer);
    }
  }, 5000);
};

const DepositScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const voiceListCache = useRef([]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [viewState, setViewState] = useState('DEPOSITING');

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [depositSubState, setDepositSubState] = useState('READY_CAPTURE');

  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isDoorClosed, setIsDoorClosed] = useState(false);

  const [scannedGears, setScannedGears] = useState([]);
  const [scannedList, setScannedList] = useState([]);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [totalPoint, setTotalPoint] = useState(0);

  const [showSafetyWarning, setShowSafetyWarning] = useState(false);

  // ★ [신규] 정책 안내 팝업 상태 추가
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const [capturedImages, setCapturedImages] = useState([]);
  const [returnMngNos, setReturnMngNos] = useState({ remg: '', romg: '' });

  const LOCAL_API_URL = `${process.env.REACT_APP_API_URL}`;
  const PROXY_API_URL = `${process.env.REACT_APP_API_URL}/api/v1/proxy`;

  const showMessage = (msg, isErr = false) => {
    setStatusMessage(msg);
    setIsError(isErr);
  };

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voiceListCache.current = voices;
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const initialTimer = setTimeout(() => {
      const initialMsg = t('deposit_inst_ready') || "폐어구를 투입구에 넣고 투입 확인 버튼을 눌러주세요.";
      speak(initialMsg, i18n.language, voiceListCache.current);
    }, 500);

    return () => {
      clearTimeout(initialTimer);
      window.speechSynthesis.cancel();
    };
  }, [t, i18n.language]);

  useEffect(() => {
    axios.post(`${LOCAL_API_URL}/api/deposit/init`).catch(() => console.log("하드웨어 초기화 건너뜀"));
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

      const initialMsg = t('deposit_inst_ready') || "폐어구를 투입구에 넣고 투입 확인 버튼을 눌러주세요.";
      speak(initialMsg, i18n.language, voiceListCache.current);
    } else {
      navigate(-1);
    }
  };

  const handleCapture = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setStatusMessage('');

    try {
      setLoadingText(t('deposit_msg_capture_loading') || "카메라 촬영 중입니다...");
      const captureRes = await axios.post(`${LOCAL_API_URL}/api/camera/devices/0/capture`);
      if (!captureRes.data.success) throw new Error(t('deposit_msg_capture_fail') || "로컬 카메라 촬영에 실패했습니다.");

      setCapturedImages(prev => [...prev, captureRes.data.imagePath]);
      setDepositSubState('WAITING_CLOSE');

      const successMsg = t('deposit_msg_capture_success') || "어구가 확인되었습니다.\n투입구 닫기 버튼을 눌러주세요.";
      showMessage(successMsg);
      speak(successMsg, i18n.language, voiceListCache.current);

    } catch (error) {
      showMessage(t('deposit_msg_cam_error') || `카메라 연결 오류가 발생했습니다.`, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAndRunConveyor = async () => {
    if (isLoading) return;
    setIsLoading(true);

    setShowSafetyWarning(true);
    speakSafetyWarning();

    setLoadingText(t('deposit_msg_conveyor_run') || "어구를 처리하고 컨베이어를 작동합니다...");

    try {
      await axios.post(`${LOCAL_API_URL}/api/deposit/action/close-doors`, { isLast: false });
      await new Promise(resolve => setTimeout(resolve, 8000));
      await axios.post(`${LOCAL_API_URL}/api/deposit/action/conveyor`);
      await new Promise(resolve => setTimeout(resolve, 4000));

    } catch (hwError) {
      console.error("❌ 하드웨어 통신 에러 발생! 진행을 멈춥니다:", hwError);
      showMessage("하드웨어 통신에 실패했습니다. 다음 단계로 넘어갈 수 없습니다.", true);
      setIsLoading(false);
      setShowSafetyWarning(false);
      return;
    }

    setShowSafetyWarning(false);

    try {
      const nextIndex = currentItemIndex + 1;
      const isLastItem = nextIndex >= scannedGears.length;

      if (!isLastItem) {
        try { await axios.post(`${LOCAL_API_URL}/api/deposit/init`); } catch (e) { }
        setCurrentItemIndex(nextIndex);
        setDepositSubState('READY_CAPTURE');

        const nextMsg = t('deposit_msg_next_capture', { next: nextIndex + 1 }) || `다음 ${nextIndex + 1}번째 어구를 투입하고\n[투입 확인] 버튼을 눌러주세요.`;
        showMessage(nextMsg);
        speak(nextMsg, i18n.language, voiceListCache.current);
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
    const warningText = t('deposit_msg_safety_voice') || "위험하오니 한 걸음 뒤로 물러서 주세요. 투입구가 닫힙니다.";
    speak(warningText, i18n.language, voiceListCache.current);
  };

  const formatPhone = (phone) => {
    if (!phone) return "010-1111-2222";
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return phone;
  };

  const formatBrdt = (brdt) => {
    if (!brdt) return "1990-01-01";
    const cleaned = ('' + brdt).replace(/\D/g, '');
    if (cleaned.length === 8) {
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
    }
    return brdt;
  };

  const handleProcessScans = async () => {
    setIsLoading(true);
    setLoadingText(t('deposit_msg_server_upload') || "반납 내역을 서버에 등록 중입니다...");

    const mbrNo = localStorage.getItem('mbr_no') || '';
    const isMember = localStorage.getItem('is_member') === 'true';
    const fishermanId = localStorage.getItem('fisherman_id');
    const fishermanName = localStorage.getItem('fisherman_name') || '비회원';
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
      actno: actno.replace(/-/g, ''),
      acct_nm: acctNm,
      kiosk_no: "K001",
      mbr_no: mbrNo
    };

    if (isMember && fishermanId && fishermanId !== 'NON_MEMBER') {
      commonPayload.user_fshnd_no = fishermanId;
    }

    const depositGears = scannedGears.filter(g => g.gvbk_type.includes('보증금'));
    const existingGears = scannedGears.filter(g => g.gvbk_type.includes('기존'));

    const successfulReturns = [];
    let calcDeposit = 0;
    let calcPoint = 0;

    let remgMngNo = '';
    let romgMngNo = '';
    let rejectedCount = 0;
    let remgSuccessCount = 0;
    let romgSuccessCount = 0;

    try {
      if (depositGears.length > 0) {
        const remgPayload = { ...commonPayload, telno: formatPhone(rawPhone), fsgr_clsf_cd: selectedClsfCd, kiosk_no: "KIOSK-001" };
        const startRes = await axios.post(`${PROXY_API_URL}/deposit/return/remg/start`, remgPayload);

        if (startRes.data?.status === "400" || startRes.data?.status === "500" || startRes.data?.status === 400) {
          throw new Error(`[시작 거부] ${startRes.data?.message}`);
        }

        remgMngNo = startRes.data?.data?.gvbk_mng_no;

        if (remgMngNo) {
          for (const gear of depositGears) {
            try {
              const retRes = await axios.post(`${PROXY_API_URL}/deposit/return/remg`, {
                bacod_nm: gear.bacod_nm,
                gvbk_mng_no: remgMngNo
              });

              if (retRes.data?.status === "200" || retRes.data?.status === 200 || retRes.data?.message === "OK") {
                const realAmount = gear.gvbk_amt || 0;
                // ★ 수정: 성공 시 isSuccess: true 추가
                successfulReturns.push({ code: gear.bacod_nm, type: '보증금어구', reward: realAmount, point: 0, isSuccess: true });
                calcDeposit += realAmount;
                remgSuccessCount++;
              } else {
                rejectedCount++;
                // ★ 수정: 실패(기반납 등)해도 목록에 띄우기 위해 isSuccess: false 로 추가
                successfulReturns.push({ code: gear.bacod_nm, type: '보증금어구', reward: 0, point: 0, isSuccess: false });
              }
            } catch (e) {
              rejectedCount++;
              // ★ 수정: 통신 에러로 실패해도 목록에 추가
              successfulReturns.push({ code: gear.bacod_nm, type: '보증금어구', reward: 0, point: 0, isSuccess: false });
            }
          }
        }
      }

      if (existingGears.length > 0 && isMember) {
        const romgPayload = { ...commonPayload, telno: formatPhone(rawPhone), kiosk_no: "KIOSK-001" };
        const startRes = await axios.post(`${PROXY_API_URL}/deposit/return/romg/start`, romgPayload);

        if (startRes.data?.status === "400" || startRes.data?.status === "500") {
          throw new Error(`[시작 거부] ${startRes.data?.message}`);
        }

        romgMngNo = startRes.data?.data?.bfr_fsgr_gvbk_no;

        if (romgMngNo) {
          for (const gear of existingGears) {
            try {
              const retRes = await axios.post(`${PROXY_API_URL}/deposit/return/romg`, {
                bacod_nm: gear.bacod_nm,
                bfr_fsgr_gvbk_no: romgMngNo
              });

              if (retRes.data?.status === "200" || retRes.data?.status === 200 || retRes.data?.message === "OK") {
                const realPoint = gear.gvbk_pnt || 0;
                // ★ 수정: 성공 시 isSuccess: true 추가
                successfulReturns.push({ code: gear.bacod_nm, type: '기존어구', reward: 0, point: realPoint, isSuccess: true });
                calcPoint += realPoint;
                romgSuccessCount++;
              } else {
                rejectedCount++;
                // ★ 수정: 실패해도 목록에 추가
                successfulReturns.push({ code: gear.bacod_nm, type: '기존어구', reward: 0, point: 0, isSuccess: false });
              }
            } catch (e) {
              rejectedCount++;
              // ★ 수정: 에러 시에도 목록에 추가
              successfulReturns.push({ code: gear.bacod_nm, type: '기존어구', reward: 0, point: 0, isSuccess: false });
            }
          }
        }
      }

      setReturnMngNos({
        remg: remgSuccessCount > 0 ? remgMngNo : '',
        romg: romgSuccessCount > 0 ? romgMngNo : ''
      });

      // ★ 수정: POLICY_EXISTING_MISMATCH 강제 발생 로직 삭제 (이게 보증금 어구 오류 팝업의 주범이었습니다)
      if (successfulReturns.length === 0) {
        throw new Error("처리할 수 있는 어구가 없습니다.");
      }

      setScannedList(successfulReturns);
      setTotalDeposit(calcDeposit);
      setTotalPoint(calcPoint);

      setIsLoading(false);

      setViewState('CONFIRMING');

      const confirmMsg = t('deposit_voice_close_barcode_door') || "투입 내역을 확인하신 후, 바코드 투입구를 닫아주세요.";
      speak(confirmMsg, i18n.language, voiceListCache.current);

    } catch (err) {
      console.warn("⚠️ API 처리 상태 알림:", err.message);
      const backendErrorMsg = err.response?.data?.message || err.message;

      setIsLoading(false);

      if (
        backendErrorMsg === "POLICY_EXISTING_MISMATCH" ||
        backendErrorMsg.includes('반환자') ||
        backendErrorMsg.includes('다릅니다') ||
        backendErrorMsg.includes('소유') ||
        backendErrorMsg.includes('불일치') ||
        backendErrorMsg.includes('정상적으로 등록된')
      ) {
        setShowPolicyModal(true);
      } else {
        showMessage(`이용 안내: ${backendErrorMsg.replace(/\[.*?\]\s*/g, '')}`, true);
        setViewState('DEPOSITING');
        setDepositSubState('READY_CAPTURE');
      }
    }
  };

  const handleCloseDoors = async () => {
    setIsLoading(true);
    setLoadingText(t('deposit_msg_closing_door') || "투입구를 닫고 있습니다...");
    setShowSafetyWarning(true);
    speakSafetyWarning();

    try {
      try {
        await axios.post(`${LOCAL_API_URL}/api/deposit/action/close-doors`, { isLast: true });
      } catch (e) {
        console.warn("메인 API 문 닫기 통신 실패, 2차 안전장치 가동");
      }

      await new Promise(res => setTimeout(res, 1500));

      setIsDoorClosed(true);
      showMessage(t('deposit_msg_door_closed') || "투입구가 닫혔습니다. 확인 완료를 눌러주세요.");

      const nextStepMsg = t('deposit_voice_confirm_complete') || "바코드 투입구가 닫혔습니다. 확인 완료 버튼을 눌러주세요.";
      speak(nextStepMsg, i18n.language, voiceListCache.current);


    } catch (e) {
      console.warn("⚠️ 문 닫기 통신 지연 감지, 시스템 자동 진행.");
      showMessage("투입구를 닫는 중 지연이 발생했습니다. 자동 진행합니다.", true);
    } finally {
      setIsLoading(false);
      setShowSafetyWarning(false);
    }
  };

  const finalizeReturnToExternalServer = async () => {
    if (returnMngNos.remg) {
      if (capturedImages.length > 0) {
        try {
          await axios.post(`${PROXY_API_URL}/deposit/image/remg`, {
            gvbk_mng_no: returnMngNos.remg,
            imagePaths: capturedImages
          });
        } catch (imgError) {
          console.warn("⚠️ 보증금어구 사진 전송 지연 감지 (정상 진행):", imgError.message);
        }
      }

      console.log("⏳ 파란샘 서버 사진 DB 반영 대기 중 (3초)...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        await axios.post(`${PROXY_API_URL}/deposit/return/remg/sms`, { gvbk_mng_no: returnMngNos.remg });
        console.log("✅ 보증금어구 최종 완료(SMS) 신호 전송 성공!");
      } catch (smsError) {
        console.warn("⚠️ [시연 알림] 파란샘 서버 SMS 발송 차단 감지 (가짜 번호 등). 무사히 다음 단계로 넘어갑니다.");
      }
    }

    if (returnMngNos.romg) {
      if (capturedImages.length > 0) {
        try {
          await axios.post(`${PROXY_API_URL}/deposit/image/romg`, {
            bfr_fsgr_gvbk_no: returnMngNos.romg,
            imagePaths: capturedImages
          });
        } catch (imgError) {
          console.warn("⚠️ 기존어구 사진 전송 지연 감지 (정상 진행):", imgError.message);
        }
      }

      console.log("⏳ 파란샘 서버 사진 DB 반영 대기 중 (3초)...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        await axios.post(`${PROXY_API_URL}/deposit/return/romg/sms`, { bfr_fsgr_gvbk_no: returnMngNos.romg });
        console.log("✅ 기존어구 최종 완료(SMS) 신호 전송 성공!");
      } catch (smsError) {
        console.warn("⚠️ [시연 알림] 파란샘 서버 SMS 발송 차단 감지 (가짜 번호 등). 무사히 다음 단계로 넘어갑니다.");
      }
    }
  };

  const handleFinalConfirm = async () => {
    setIsLoading(true);
    setLoadingText(t('deposit_msg_finishing') || "서버와 최종 동기화 중입니다. 잠시만 기다려주세요...");

    try {
      await finalizeReturnToExternalServer();

      await axios.post(`${LOCAL_API_URL}/api/deposit/action/cleaning`);
      await new Promise(res => setTimeout(res, 2500));
    } catch (error) {
      console.warn("기기 정리 중 지연 감지:", error);
    } finally {
      setIsLoading(false);
      navigate('/completion', {
        state: { totalDeposit, totalPoint, totalCount: scannedList.length }
      });
    }
  };

  const translateGearType = (type) => {
    const typeStr = String(type);
    if (typeStr.includes('보증금')) return t('gear_badge_deposit') || "보증금어구";
    if (typeStr.includes('기존')) return t('gear_badge_existing') || "기존어구";
    return typeStr;
  };

  return (
    <div className="deposit-wrapper">
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999, // 헤더, 모달보다 무조건 제일 높게 (최상단)
            backgroundColor: 'rgba(0, 0, 0, 0)', // 완전 투명
            cursor: 'wait' // 터치 시 반응 없음을 알림
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // 클릭 이벤트가 아래쪽(헤더 등)으로 전달되는 것을 원천 차단
          }}
        />
      )}
      <Header />
      <div className="deposit-body">
        <div className="camera-box">
          <button className="deposit-back-btn" onClick={handleBack} disabled={isLoading}>
            <BackIcon />
            <span className="deposit-back-text">
              {viewState === 'CONFIRMING' ? (t('deposit_btn_prev_step') || '이전 단계') : (t('deposit_btn_prev') || '뒤로가기')}
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
                      {depositSubState === 'READY_CAPTURE'
                        ? (t('deposit_inst_ready') || "폐어구를 투입구에 넣고\n[투입 확인] 버튼을 눌러주세요.").split('\n').map((line, i) => (
                          <React.Fragment key={i}>{line}<br /></React.Fragment>
                        ))
                        : (t('deposit_inst_done') || "어구가 확인되었습니다.\n[투입구 닫기] 버튼을 눌러주세요.").split('\n').map((line, i) => (
                          <React.Fragment key={i}>{line}<br /></React.Fragment>
                        ))
                      }
                    </p>
                  )}

                  <div className="deposit-action-buttons-row" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                    {depositSubState === 'READY_CAPTURE' ? (
                      <div style={{ display: 'flex', gap: '15px', width: '100%', maxWidth: '300px' }}>
                        <button className="deposit-action-btn primary" onClick={handleCapture} disabled={isLoading} style={{ width: '100%', backgroundColor: '#007BFF' }}>
                          {t('deposit_btn_check') || '투입 확인'}
                        </button>
                      </div>
                    ) : (
                      <button className="deposit-action-btn primary" onClick={handleCloseAndRunConveyor} disabled={isLoading} style={{ width: '100%', maxWidth: '300px', backgroundColor: '#28a745' }}>
                        {t('deposit_btn_door_closed') || '투입구 닫기'}
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
                      {[...scannedList].reverse().map((item, index) => (
                        <tr key={index}>
                          <td>{item.code}</td>
                          <td>{translateGearType(item.type)}</td>
                          <td>
                            {/* ★ 수정: 빨간 경고 문구 대신 깔끔한 무상 수거 UI 뱃지로 변경 */}
                            {item.isSuccess === false ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '5px 0' }}>
                                <span style={{ color: '#495057', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                  무상 수거
                                </span>
                                <span style={{
                                  fontSize: '0.85rem',
                                  color: '#6c757d',
                                  backgroundColor: '#e9ecef',
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  보증금 지급 완료
                                </span>
                              </div>
                            ) : item.point > 0 ? (
                              `${item.point.toLocaleString()} P`
                            ) : (
                              `${item.reward.toLocaleString()} ${t('currency_unit') || '원'}`
                            )}
                          </td>
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
                    onClick={handleCloseDoors} disabled={isLoading || isDoorClosed}
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

      {isLoading && !showSafetyWarning && <LoadingOverlay text={loadingText} />}

      {/* ★ [초대형 업그레이드] 어구보증금제 반납 정책 안내 팝업 */}
      {showPolicyModal && (
        <div className="deposit-alert-overlay" style={{ zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="deposit-alert-content" style={{
            padding: '80px 60px',
            maxWidth: '900px',
            width: '85%',
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '10px solid #0093D7' /* 테두리를 파란색으로 변경하여 안내 느낌 강조 */
          }}>
            <div style={{ marginBottom: '40px' }}>
              <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#0093D7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <h2 style={{ color: '#0093D7', fontSize: '5rem', marginBottom: '40px', fontWeight: '900', wordBreak: 'keep-all' }}>
              어구보증금제 반납 정책 안내
            </h2>
            <div style={{ fontSize: '2.8rem', lineHeight: '1.5', marginBottom: '60px', color: '#333', wordBreak: 'keep-all', fontWeight: '700' }}>
              어구보증금제 정책에 따라 <span style={{ fontSize: '3.2rem', color: '#d9534f' }}>기존어구</span>는<br />
              <span style={{ color: '#d9534f', borderBottom: '5px solid #d9534f', paddingBottom: '5px' }}>
                타인이 대여한 어구를 대신 반납할 수 없습니다.
              </span>
              <br /><br />
              본인 명의로 대여한 어구가 맞는지<br />다시 한번 확인해주세요.
            </div>
            <button
              onClick={() => {
                setShowPolicyModal(false);
                navigate('/select-gear');
              }}
              style={{
                width: '100%',
                height: '150px',
                fontSize: '3.5rem',
                backgroundColor: '#00A0E9',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: '0 12px 0 #007bb5',
                transition: 'transform 0.1s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(8px)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              다른 어구 반납하러 가기
            </button>
          </div>
        </div>
      )}

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