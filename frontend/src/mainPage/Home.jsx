// src/mainPage/Home.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios'; // ★ [추가] API 호출을 위해 axios 임포트
import './Home.css';
import BgAll from '../assets/bg_all.png';
import LoginModal from './modals/LoginModal'; 

// [영상 파일 임포트]
import VideoKo from '../assets/어구보증금관리센터_제도확대_국문영상_최종본.mp4';
import VideoEn from '../assets/어구보증금관리센터_제도확대_영문영상_최종본.mp4';

// [컴포넌트 임포트]
import Header from './Header';
import HeroSection from './HeroSection';
import InfoBanner from './InfoBanner';
import MainActionButtons from './MainActionButtons';
import AlternateAuthModal from '../authPage/AlternateAuthScreen';

// [모달 컴포넌트 임포트]
import AuthChoiceModal from './modals/AuthChoiceModal';
import PassModal from './modals/PassModal';
import ThirdPartyModal from './modals/ThirdPartyModal';
import PrivacyModal from './modals/PrivacyModal'; 
import PrivacyConsentModal from './modals/PrivacyConsentModal'; 
import GuideContainerModal from './modals/GuideContainerModal';
import ContactModal from './modals/ContactModal';
import AccountInputModal from './modals/AccountInputModal';
// src/mainPage/Home.jsx 최상단 근처
import GearTypeSelectModal from '../certificationPage/GearTypeSelectModal'; // ★ 추가

const Home = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const voiceListCache = useRef([]);
  const init02PlayedRef = useRef(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // 모달 상태 관리
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAltAuthModal, setShowAltAuthModal] = useState(false);
  
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [showThirdPartyModal, setShowThirdPartyModal] = useState(false);
  const [showFullTextModal, setShowFullTextModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGearTypeModal, setShowGearTypeModal] = useState(false);
  // 전문 보기 내용
  const [fullTextContent, setFullTextContent] = useState('');

  // 체크박스 상태
  const [agreements, setAgreements] = useState({ required: false, optional: false });
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showAccountInputModal, setShowAccountInputModal] = useState(false);
  

  // ★ [신규 안전 로직] 홈 화면 진입 시 모든 투입구 닫기 (완전 초기화)
  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
    const closeAllDoors = async () => {
      try {
        // 1. 폐어구 투입구와 바코드 투입구를 모두 닫으라는 명령을 백엔드에 전송
        // (방금 백엔드 코드에서 isLast: true 일 때 둘 다 닫히게 만들었으므로 파라미터를 추가해줍니다)
        await axios.post('http://localhost:8080/api/deposit/action/close-doors', { isLast: true });
        console.log("🏠 HOME: 안전을 위해 모든 투입구 닫힘 요청 완료 (폐어구 + 바코드)");

      } catch (error) {
        console.warn("🏠 HOME: 통합 문 닫기 요청 실패, 개별 닫기 재시도...", error);
        
        // 2. 통합 API가 실패할 경우를 대비한 2차 안전장치 (Fallback)
        // 각각의 문을 제어하는 기본 API를 한 번 더 호출해서 억지로라도 닫습니다.
        try {
          // 바코드 투입구 개별 닫기 (하드웨어 제어 라우터가 있다면)
          fetch('http://localhost:8080/api/auth/hw/barcode-door', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ open: false })
          }).catch(()=>{});
        } catch(e) {}
      }
    };

    closeAllDoors();
  }, []); // [] : 페이지가 처음 렌더링될 때 딱 한 번 실행됨

  /* --- TTS 로직 --- */
  const getBestVoice = (langCode, voiceList) => {
    if (voiceList.length === 0) return null;
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

  const speak = (text, lang, voiceList, onEndCallback = null) => {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = {
      'ko': 'ko-KR', 'en': 'en-US', 'vi': 'vi-VN',
      'tl': 'fil-PH', 'id': 'id-ID', 'my': 'my-MM'
    };
    const shortLang = lang.substring(0, 2);
    utterance.lang = langMap[shortLang] || 'en-US';
    const selectedVoice = getBestVoice(utterance.lang, voiceList);
    if (selectedVoice) utterance.voice = selectedVoice;
    if (onEndCallback) utterance.onend = onEndCallback;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voiceListCache.current = voices;
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    const playInit02AndRemoveListener = () => {
      if (init02PlayedRef.current) return;
      init02PlayedRef.current = true;
      const text = t('INIT_02');
      speak(text, i18n.language, voiceListCache.current, null);
      document.removeEventListener('click', playInit02AndRemoveListener);
    };

    const textInit01 = t('INIT_01');
    init02PlayedRef.current = false;
    const timer = setTimeout(() => {
      const onInit01End = () => document.addEventListener('click', playInit02AndRemoveListener);
      speak(textInit01, i18n.language, voiceListCache.current, onInit01End);
    }, 300);
    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
      document.removeEventListener('click', playInit02AndRemoveListener);
    };
  }, [t, i18n.language]);

  // --- 인증 및 모달 플로우 핸들러 ---

  // 1. QR(회원) 인증 선택 시
  const openMemberAuthFlow = () => { 
    setShowAuthModal(false); 
    setShowThirdPartyModal(true); 
  };

  const handleLoginChoice = () => {
    setShowAuthModal(false);
    setShowLoginModal(true);
  };

  const handleThirdPartyAgree = () => { 
    setShowThirdPartyModal(false); 
    navigate('/auth'); 
  };

  // 2. PASS 인증 선택 시
  const handlePassChoice = () => {
    setShowAuthModal(false);
    setShowPrivacyConsent(true);
  };

  // 3. PASS 동의 완료 시
  const handlePrivacyConfirm = () => {
    setShowPrivacyConsent(false);
    setShowPassModal(true);
  };

  // (구) 비회원 관련 핸들러
  const openNonMemberAuthFlow = () => {
    setShowAuthModal(false);
    setShowPrivacyModal(true);
    setAgreements({ required: false, optional: false });
  };
  const handlePrivacyAgree = () => {
    if (!agreements.required) {
      alert(t('alert_agree_required'));
      return;
    }
    setShowPrivacyModal(false);
    setShowAltAuthModal(true);
  };

  // --- 기타 UI 핸들러 ---
  const openFullText = (type) => {
    const contentKey = type === 'required' ? 'agreement_text_required' : 'agreement_text_optional';
    setFullTextContent(t(contentKey));
    setShowFullTextModal(true);
  };

  const toggleAgreement = (key) => { setAgreements(prev => ({ ...prev, [key]: !prev[key] })); };

  // 현재 언어에 맞는 비디오 소스 결정
  const currentVideoSrc = i18n.language.startsWith('ko') ? VideoKo : VideoEn;

  return (
    <div className="kiosk-wrapper" style={{ backgroundImage: `url(${BgAll})` }}>
      <Header />

      <HeroSection
        isVideoPlaying={isVideoPlaying}
        setIsVideoPlaying={setIsVideoPlaying}
        currentVideoSrc={currentVideoSrc}
      />

      <section className="bottom-wave-section">
        <InfoBanner onContactClick={() => setShowContactModal(true)} />
        <MainActionButtons
          onStart={() => setShowAuthModal(true)}
          onGuide={() => setShowGuideModal(true)}
        />
      </section>

      {/* --- 모달 렌더링 --- */}
      
      {showAuthModal && (
        <AuthChoiceModal
          onClose={() => setShowAuthModal(false)}
          onQr={openMemberAuthFlow}
          onPass={handlePassChoice}
          onLogin={handleLoginChoice} 
        />
      )}

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}

      {showPrivacyConsent && (
        <PrivacyConsentModal
          onClose={() => setShowPrivacyConsent(false)}
          onConfirm={handlePrivacyConfirm}
        />
      )}

      {showPassModal && (
        <PassModal 
          onClose={() => setShowPassModal(false)} 
          onNonMember={() => {
            setShowPassModal(false); // 먼저 PASS 모달을 끄고
            setTimeout(() => {
              setShowAccountInputModal(true); // 아주 잠깐 뒤에 계좌 모달을 염
            }, 100); 
          }}
        />
      )}
      {/* ★ 비회원 계좌 입력 팝업 렌더링 */}
      {showAccountInputModal && (
        <AccountInputModal onClose={() => setShowAccountInputModal(false)} />
      )}
      {showThirdPartyModal && (
        <ThirdPartyModal
          onClose={() => setShowThirdPartyModal(false)}
          onAgree={handleThirdPartyAgree}
        />
      )}

      {showPrivacyModal && (
        <PrivacyModal
          onClose={() => setShowPrivacyModal(false)}
          onAgree={handlePrivacyAgree}
          agreements={agreements}
          toggleAgreement={toggleAgreement}
          openFullText={openFullText}
        />
      )}

      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}

      {showFullTextModal && (
        <div className="modal-backdrop" onClick={() => setShowFullTextModal(false)}>
          <div className="full-text-modal" onClick={(e) => e.stopPropagation()}>
            <div className="full-text-header">
              <h3>{t('full_text_title')}</h3>
              <button className="full-text-close" onClick={() => setShowFullTextModal(false)}>✖</button>
            </div>
            <div className="full-text-body">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{fullTextContent}</pre>
            </div>
          </div>
        </div>
      )}

      {showGuideModal && (
        <GuideContainerModal onClose={() => setShowGuideModal(false)} />
      )}
      
      {showGearTypeModal && (
        <GearTypeSelectModal onClose={() => setShowGearTypeModal(false)} />
      )}

      {showAltAuthModal && <AlternateAuthModal onClose={() => setShowAltAuthModal(false)} />}
    </div>
  );
};

export default Home;