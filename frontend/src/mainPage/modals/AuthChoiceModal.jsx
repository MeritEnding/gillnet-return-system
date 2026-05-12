// src/mainPage/modals/AuthChoiceModal.jsx
import React, { useEffect, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import PassLogo from '../../assets/PassLogo.png';

const AuthChoiceModal = ({ onClose, onQr, onPass, onLogin }) => {
  const { t, i18n } = useTranslation();
  const voiceListCache = useRef([]);

  const isMyanmar = i18n.language.startsWith('my');

  // TTS(음성 합성) 함수 구현
  const speak = (text, lang) => {
    if (!('speechSynthesis' in window)) return;
    
    // 기존에 나오던 음성이 있다면 멈추고 새 음성 시작
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 언어 설정 매핑
    const langMap = {
      'ko': 'ko-KR', 'en': 'en-US', 'vi': 'vi-VN',
      'tl': 'fil-PH', 'id': 'id-ID', 'my': 'my-MM'
    };
    const shortLang = lang.substring(0, 2);
    utterance.lang = langMap[shortLang] || 'ko-KR'; // 기본값 한국어
    
    // 알맞은 목소리 찾기 (선택사항)
    let bestVoice = null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        if (shortLang === 'ko') bestVoice = voices.find(v => v.lang.includes('ko'));
        else if (shortLang === 'vi') bestVoice = voices.find(v => v.lang.includes('vi'));
        else if (shortLang === 'id') bestVoice = voices.find(v => v.lang.includes('id'));
        else if (shortLang === 'tl') bestVoice = voices.find(v => v.lang.includes('fil') || v.lang.includes('tl'));
        else if (shortLang === 'my') bestVoice = voices.find(v => v.lang.includes('my'));
        else bestVoice = voices.find(v => v.lang.includes('en'));
        
        if (bestVoice) utterance.voice = bestVoice;
    }

    // 약간 천천히 또박또박 읽도록 설정 (0.9 ~ 1.0)
    utterance.rate = 1.0; 
    
    window.speechSynthesis.speak(utterance);
  };

  // 모달이 처음 켜질 때 음성 안내 실행
  useEffect(() => {
    // 음성 목록 미리 로드
    if ('speechSynthesis' in window) {
        const loadVoices = () => { voiceListCache.current = window.speechSynthesis.getVoices(); };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // 번역본 파일(ko.json 등)에서 텍스트를 가져옵니다. 
    // 만약 AUTH_CHOICE_VOICE 키를 안 만드셨다면 기본 안내 멘트가 나오게 폴백(Fallback) 처리했습니다.
    const voiceText = t('AUTH_CHOICE_VOICE') || "원하시는 사용자 인증 방법을 선택해 주세요. 비회원이신 경우 패스 인증을 선택해 주세요.";
    
    // 화면이 뜨자마자 음성 출력!
    speak(voiceText, i18n.language);

    // 모달이 꺼질 때 음성도 같이 끄기
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [t, i18n.language]);


  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-content auth-choice-modal ${isMyanmar ? 'lang-my' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
        <h2 className="modal-title">{t('auth_choice_title')}</h2>
        
        <p className="auth-nonmember-guide">
          <Trans i18nKey="auth_nonmember_guide">
            비회원님은 오른쪽의 <strong>'PASS 인증'</strong>으로 진행해 주세요.
          </Trans>
        </p>
        
        <div className="modal-buttons-row">
          
          {/* 1) 회원인증 (QR) */}
          <button className="modal-btn btn-qr-large" onClick={onQr}>
            <div className="btn-icon-area-large">
              <svg viewBox="0 0 100 100" fill="white" className="auth-icon-svg">
                <path d="M15 15h25v25H15V15zm5 5v15h15V20H20z" />
                <rect x="25" y="25" width="5" height="5" fill="white" />
                <path d="M60 15h25v25H60V15zm5 5v15h15V20H65z" />
                <rect x="70" y="25" width="5" height="5" fill="white" />
                <path d="M15 60h25v25H15V60zm5 5v15h15V65H20z" />
                <rect x="25" y="70" width="5" height="5" fill="white" />
                <path d="M60 60h5v5h-5v-5zm10 0h5v5h-5v-5zm10 0h5v5h-5v-5z" />
                <path d="M60 70h5v5h-5v-5zm10 0h15v5H70v-5z" />
                <path d="M60 80h10v5H60v-5zm15 0h10v5H75v-5z" />
                <path d="M50 50h5v5h-5v-5zm10 0h5v5h-5v-5zm-20 0h5v5h-5v-5z" />
              </svg>
            </div>
            <div className="btn-text-area-large">
              <span className="auth-main-text">{t('auth_qr_btn_main')}</span>
              <span className="auth-sub-text">{t('auth_qr_btn_sub')}</span>
            </div>
          </button>

          {/* 2) 아이디/비밀번호 로그인 */}
          <button className="modal-btn btn-login-large" onClick={onLogin}>
            <div className="btn-icon-area-large">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="auth-icon-svg" style={{ width: '65%', height: '65%' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="btn-text-area-large">
              <span className="auth-main-text">{t('auth_login_btn_main')}</span>
              <span className="auth-sub-text">{t('auth_login_btn_sub')}</span>
            </div>
          </button>

          {/* 3) PASS 인증 */}
          <button className="modal-btn btn-pass-large" onClick={onPass}>
            <div className="btn-icon-area-large pass-logo-wrap-large">
              <img src={PassLogo} alt="PASS" className="pass-logo-img-large" draggable={false} />
            </div>
            <div className="btn-text-area-large">
              <span className="auth-main-text">{t('auth_pass_btn_main')}</span>
              <span className="auth-sub-text">{t('auth_pass_btn_sub')}</span>
            </div>
          </button>

        </div>

        <p className="auth-guide-text">{t('auth_register_guide')}</p>
      </div>
    </div>
  );
};

export default AuthChoiceModal;