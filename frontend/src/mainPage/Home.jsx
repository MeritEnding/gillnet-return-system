// src/mainPage/Home.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './Home.css';
import BgAll from '../assets/bg_all.png';
import LoginModal from './modals/LoginModal'; 

// [영상 파일 임포트]
import VideoKo from '../assets/어구보증금관리센터_제도확대_국문영상_최종본.mp4';
import VideoEn from '../assets/어구보증금관리센터_제도확대_영문영상_최종본.mp4';

// [자막 파일 임포트]
import SubVi from '../assets/subtitles/vi.vtt';
import SubId from '../assets/subtitles/id.vtt';
import SubTl from '../assets/subtitles/tl.vtt';
import SubMy from '../assets/subtitles/my.vtt';

// [컴포넌트 임포트]
import Header from './Header';
import Footer from './Footer';
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
import GearTypeSelectModal from '../certificationPage/GearTypeSelectModal'; 

const Home = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const voiceListCache = useRef([]);
  const init02PlayedRef = useRef(false);
  
  // ★ [핵심 1] 발화 객체(Utterance)가 중간에 날아가지 않도록 보관하는 전역 참조
  window.utterances = window.utterances || []; 
  const currentUtteranceRef = useRef(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
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
  const [fullTextContent, setFullTextContent] = useState('');

  const [agreements, setAgreements] = useState({ required: false, optional: false });
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showAccountInputModal, setShowAccountInputModal] = useState(false);
  
  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
    const closeAllDoors = async () => {
      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/deposit/action/close-doors`, { isLast: true });
        console.log("🏠 HOME: 안전을 위해 모든 투입구 닫힘 요청 완료");
      } catch (error) {
        console.warn("🏠 HOME: 통합 문 닫기 요청 실패, 개별 닫기 재시도...");
        try {
          fetch(`${process.env.REACT_APP_API_URL}/api/auth/hw/barcode-door`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ open: false })
          }).catch(()=>{});
        } catch(e) {}
      }
    };
    closeAllDoors();

    // ★ [핵심 2] 컴포넌트가 꺼질 때(다른 화면으로 갈 때) 목소리도 확실하게 꺼줌
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getBestVoice = (langCode, voiceList) => {
    if (voiceList.length === 0) return null;
    let bestVoice = null;
    if (langCode.includes('ko')) bestVoice = voiceList.find(v => v.lang.includes('ko'));
    else if (langCode.includes('vi')) bestVoice = voiceList.find(v => v.lang.includes('vi'));
    else if (langCode.includes('id')) bestVoice = voiceList.find(v => v.lang.includes('id'));
    else if (langCode.includes('tl') || langCode.includes('fil')) bestVoice = voiceList.find(v => v.lang.includes('fil') || v.lang.includes('tl'));
    else if (langCode.includes('my')) bestVoice = voiceList.find(v => v.lang.includes('my'));
    else bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en'));
    return bestVoice;
  };

  // ★ [핵심 3] 개선된 완벽한 TTS 재생 함수
  const speak = (text, lang, voiceList, onEndCallback = null) => {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }

    // 1. 기존에 떠들고 있던 모든 말들을 즉시 취소! (겹침 방지)
    window.speechSynthesis.cancel();

    // 2. 새로운 발화 객체 생성
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 3. 브라우저 버그(가비지 컬렉션) 방지를 위해 전역 배열에 담아둠
    window.utterances.push(utterance);
    currentUtteranceRef.current = utterance;

    const langMap = {
      'ko': 'ko-KR', 'en': 'en-US', 'vi': 'vi-VN',
      'tl': 'fil-PH', 'id': 'id-ID', 'my': 'my-MM'
    };
    
    const shortLang = lang.substring(0, 2);
    utterance.lang = langMap[shortLang] || 'en-US';
    
    const selectedVoice = getBestVoice(utterance.lang, voiceList);
    if (selectedVoice) utterance.voice = selectedVoice;

    // 4. 말이 끝났을 때의 처리
    utterance.onend = () => {
      // 다 말했으면 쓰레기통(배열) 비워주기
      const index = window.utterances.indexOf(utterance);
      if (index > -1) window.utterances.splice(index, 1);
      
      if (onEndCallback) onEndCallback();
    };

    // 혹시라도 에러가 나면 큐 비우고 다음으로 넘기기
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      if (onEndCallback) onEndCallback();
    };

    // 5. 드디어 말하기 시작
    window.speechSynthesis.speak(utterance);

    // ★ [핵심 4] 크롬 버그(15초 멈춤) 방지용 주기적 Resume
    const timer = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      } else {
        clearInterval(timer);
      }
    }, 5000);
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
      // 첫 진입 시 (자동재생 막혀있을 수 있음) 실행 시도
      speak(textInit01, i18n.language, voiceListCache.current, onInit01End);
    }, 500); // 브라우저가 준비할 수 있도록 여유시간을 500ms로 조금 늘렸습니다.

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', playInit02AndRemoveListener);
    };
  }, [t, i18n.language]);

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

  const handlePassChoice = () => {
    setShowAuthModal(false);
    setShowPrivacyConsent(true);
  };

  const handlePrivacyConfirm = () => {
    setShowPrivacyConsent(false);
    setShowPassModal(true);
  };

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

  const openFullText = (type) => {
    const contentKey = type === 'required' ? 'agreement_text_required' : 'agreement_text_optional';
    setFullTextContent(t(contentKey));
    setShowFullTextModal(true);
  };

  const toggleAgreement = (key) => { setAgreements(prev => ({ ...prev, [key]: !prev[key] })); };


  const currentLang = i18n.language;
  const currentVideoSrc = currentLang.startsWith('en') ? VideoEn : VideoKo;

  let currentSubtitleSrc = null;
  if (currentLang.startsWith('vi')) currentSubtitleSrc = SubVi;
  else if (currentLang.startsWith('id')) currentSubtitleSrc = SubId;
  else if (currentLang.startsWith('tl') || currentLang.startsWith('fil')) currentSubtitleSrc = SubTl;
  else if (currentLang.startsWith('my')) currentSubtitleSrc = SubMy;


  return (
    <div className="kiosk-wrapper" style={{ backgroundImage: `url(${BgAll})` }}>
      <Header />

      <HeroSection
        isVideoPlaying={isVideoPlaying}
        setIsVideoPlaying={setIsVideoPlaying}
        currentVideoSrc={currentVideoSrc}
        currentSubtitleSrc={currentSubtitleSrc}
        currentLang={currentLang}
      />

      <section className="bottom-wave-section">
        <InfoBanner onContactClick={() => setShowContactModal(true)} />
        <MainActionButtons
          onStart={() => setShowAuthModal(true)}
          onGuide={() => setShowGuideModal(true)}
        />
      </section>
      <Footer onContactClick={() => setShowContactModal(true)} />
      
      {showAuthModal && (
        <AuthChoiceModal
          onClose={() => setShowAuthModal(false)}
          onQr={openMemberAuthFlow}
          onPass={handlePassChoice}
          onLogin={handleLoginChoice} 
        />
      )}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      {showPrivacyConsent && <PrivacyConsentModal onClose={() => setShowPrivacyConsent(false)} onConfirm={handlePrivacyConfirm} />}
      {showPassModal && (
        <PassModal 
          onClose={() => setShowPassModal(false)} 
          onNonMember={() => {
            setShowPassModal(false); 
            setTimeout(() => { setShowAccountInputModal(true); }, 100); 
          }}
        />
      )}
      {showAccountInputModal && <AccountInputModal onClose={() => setShowAccountInputModal(false)} />}
      {showThirdPartyModal && <ThirdPartyModal onClose={() => setShowThirdPartyModal(false)} onAgree={handleThirdPartyAgree} />}
      {showPrivacyModal && (
        <PrivacyModal
          onClose={() => setShowPrivacyModal(false)}
          onAgree={handlePrivacyAgree}
          agreements={agreements}
          toggleAgreement={toggleAgreement}
          openFullText={openFullText}
        />
      )}
      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} />}
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
      {showGuideModal && <GuideContainerModal onClose={() => setShowGuideModal(false)} />}
      {showGearTypeModal && <GearTypeSelectModal onClose={() => setShowGearTypeModal(false)} />}
      {showAltAuthModal && <AlternateAuthModal onClose={() => setShowAltAuthModal(false)} />}
    </div>
  );
};

export default Home;