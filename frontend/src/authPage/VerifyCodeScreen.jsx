// src/authPage/VerifyCodeScreen.jsx (★신규 파일★)

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import { useTranslation } from 'react-i18next'; // 👈 (수정) Canvas 환경 제약으로 제거
// import './AlternateAuthScreen.css'; // 👈 (수정) CSS 재사용 (또는 VerifyCodeScreen.css 생성)

// --- 💡 (수정) 이미지 URL 정의 (import 대신) ---
const MascotImage = 'https://placehold.co/100x120/png/0096FF/white?text=K-MASCOT';
const MascotSuccess = 'https://placehold.co/100x100/28a745/white?text=성공';
const LoadingSpinner = 'https://placehold.co/100x100/gif/007bff/white?text=로딩';

// --- 💡 (★수정★) Canvas 환경을 위한 임시 t 함수 (한/영 지원) ---
const t = (key, options) => {
  // 1. 환경에서 제공하는 window.t가 있으면 최우선 사용
  if (window.t) {
    return window.t(key, options);
  }

  // 2. Fallback: localStorage에서 언어 감지
  // (i18next가 기본으로 사용하는 'i18nextLng' 키 감지)
  const lang = (localStorage.getItem('i18nextLng') || 'ko').startsWith('en') ? 'en' : 'ko';

  // 3. 번역 텍스트 정의
  const translations = {
    ko: {
      'auth_loading_alt': '로딩 중',
      'auth_success_popup_title': '사용자 인증 완료',
      'auth_success_popup_welcome': '어구를 반납을 준비합니다.',
      'auth_success_popup_loading_text': '폐어구 반납 준비중..\n조금만 기다려주세요',
      'auth_mascot_alt': '마스코트',
      'auth_success_mascot_alt': '성공 마스코트',
      'auth_step_1': '1. 사용자 인증',
      'auth_step_2': '2. 표식 인증',
      'auth_step_3': '3. 투입',
      'auth_step_label': '1단계',
      'auth_contact_label': '담당자:',
      'auth_success_popup_welcome_suffix': '님 환영합니다.',
      'error_server_communication': '서버와 통신 중 오류가 발생했습니다.',
      'verify_title': '인증번호 입력',
      'verify_instruction_prefix': '휴대폰 ',
      'verify_instruction_suffix': ' (으)로 전송된\n6자리 인증번호를 입력해 주세요.',
      'verify_resend_button': '인증번호 재전송',
      'verify_goback_button': '번호 다시 입력',
      'verify_submit_button': '인증 완료',
      'verify_fail_popup_title': '⚠️ 인증 실패',
      'verify_fail_popup_message': '인증번호가 일치하지 않거나\n유효 시간이 초과되었습니다.',
      'verify_fail_popup_retry_button': '다시 시도',
      'verify_alert_invalid_code': '6자리 인증번호를 모두 입력해주세요.',
      'alt_auth_success_popup_default_name': '고객'
    },
    en: {
      'auth_loading_alt': 'Loading...',
      'auth_success_popup_title': 'Authentication Complete',
      'auth_success_popup_welcome': 'Preparing to return fishing gear.',
      'auth_success_popup_loading_text': 'Preparing gear return...\nPlease wait a moment.',
      'auth_mascot_alt': 'Mascot',
      'auth_success_mascot_alt': 'Success Mascot',
      'auth_step_1': '1. User Auth',
      'auth_step_2': '2. Tag Auth',
      'auth_step_3': '3. Deposit',
      'auth_step_label': 'Step 1',
      'auth_contact_label': 'Contact:',
      'auth_success_popup_welcome_suffix': ', welcome.',
      'error_server_communication': 'An error occurred while communicating with the server.',
      'verify_title': 'Enter Verification Code',
      'verify_instruction_prefix': 'Please enter the 6-digit code sent to ',
      'verify_instruction_suffix': '', // (★) 영어는 접미사 없음
      'verify_resend_button': 'Resend Code',
      'verify_goback_button': 'Re-enter Number',
      'verify_submit_button': 'Verify',
      'verify_fail_popup_title': '⚠️ Verification Failed',
      'verify_fail_popup_message': 'The code is incorrect or has expired.\nPlease try again.',
      'verify_fail_popup_retry_button': 'Retry',
      'verify_alert_invalid_code': 'Please enter all 6 digits of the verification code.',
      'alt_auth_success_popup_default_name': 'Customer'
    }
  };

  // 4. 번역본 반환
  let translation = (translations[lang] && translations[lang][key]) || translations['ko'][key] || key;

  // 5. 옵션(변수) 적용
  if (options && typeof options === 'object') {
    Object.keys(options).forEach(optKey => {
      translation = translation.replace(`{${optKey}}`, options[optKey]);
    });
  }
  return translation;
};
// --- (★수정 완료★) ---


// --- 로딩 오버레이 컴포넌트 ---
const LoadingOverlay = () => (
    <div className="alt-auth-loading-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <img src={LoadingSpinner} alt={t('auth_loading_alt')} className="loading-spinner large" style={{ width: '100px', height: '100px' }} />
    </div>
);

// --- (신규) 인증번호 실패 팝업 ---
const VerifyFailPopup = ({ onRetry }) => {
  return (
    <div className="auth-popup-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="auth-popup-content" style={{ background: 'white', padding: '20px', borderRadius: '15px', textAlign: 'center', maxWidth: '400px', width: '90%', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <h2 className="popup-title" style={{ color: 'red', marginTop: '0' }}>{t('verify_fail_popup_title')}</h2>
        <div className="popup-body">
          <p className="fail-message" style={{ whiteSpace: 'pre-line', marginBottom: '25px', fontSize: '1.2rem' }}>
            {t('verify_fail_popup_message')}
          </p>
          <div className="popup-button-group" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="popup-button" style={{ flex: 1, padding: '12px', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#007bff', color: 'white' }} onClick={onRetry}>
              {t('verify_fail_popup_retry_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 이름 마스킹 헬퍼 함수 ---
const maskName = (name) => {
  // (★수정★) t 함수가 전역이므로 인자로 받을 필요 없음
  const defaultName = t('alt_auth_success_popup_default_name');
  if (!name || typeof name !== 'string' || name.length < 2) return name || defaultName;
  if (name.length === 2) return name.substring(0, 1) + '*';
  const firstChar = name.substring(0, 1);
  const lastChar = name.substring(name.length - 1);
  const middleMask = '*'.repeat(name.length - 2);
  return firstChar + middleMask + lastChar;
};

// --- 인증 완료 팝업 컴포넌트 ---
const AuthSuccessPopup = ({ userInfo }) => { 
  const displayName = maskName(userInfo?.name); // (★수정★) t 함수 필요 없음
  return (
    <div className="auth-popup-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="auth-popup-content" style={{ background: 'white', padding: '20px', borderRadius: '15px', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
        <h2 className="popup-title" style={{ color: '#007bff', marginTop: '0' }}>{t('auth_success_popup_title')}</h2>
        <div className="popup-body">
          <p className="welcome-message" style={{ fontSize: '1.2em' }}>
            <strong>
              {displayName}
              {t('auth_success_popup_welcome_suffix')}
            </strong>
            <br />
            {t('auth_success_popup_welcome')}
          </p>
          <div className="loading-animation" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
            <img src={MascotSuccess} alt={t('auth_success_mascot_alt')} className="mascot-success" style={{ width: '80px', height: 'auto' }} />
            <img src={LoadingSpinner} alt={t('auth_loading_alt')} className="loading-spinner" style={{ width: '50px', height: '50px' }} />
            <p className="loading-text" style={{ whiteSpace: 'pre-line', margin: '0', color: '#555' }}>
              {t('auth_success_popup_loading_text')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


/**
 * (신규) 인증번호 입력 화면
 */
const VerifyCodeScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // AlternateAuthScreen에서 전달받은 state
  const { verification_id, masked_phone_number, phone_number } = location.state || {};

  const [code, setCode] = useState(['', '', '', '', '', '']); // 6자리 인증번호
  const [authStatus, setAuthStatus] = useState('idle'); // 'idle', 'loading', 'success', 'failed'
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const inputRefs = useRef([]); // 6개 input DOM 참조

  const KIOSK_ID = "BUSAN-001"; 

  // --- 인증 성공 시 딜레이 및 다음 페이지 이동 ---
  useEffect(() => {
    if (authStatus === 'success') {
      const timer = setTimeout(() => {
        navigate('/certificationPage'); // 2단계로 이동
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [authStatus, navigate]);

  // --- 인증번호 입력 핸들러 ---
  const handleChange = (e, index) => {
    if (authStatus === 'loading') return;
    const value = e.target.value;
    // 숫자만 허용 (정규식)
    if (!/^[0-9]$/.test(value) && value !== '') return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // 다음 input으로 자동 포커스 이동
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // --- 키보드 백스페이스 핸들러 ---
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      // 현재 input이 비어있고 백스페이스 누르면 이전 input으로 이동
      inputRefs.current[index - 1].focus();
    }
  };

  // --- 인증번호 검증 API 호출 ---
  const handleVerifySubmit = async () => {
    if (authStatus === 'loading') return;

    const verificationCode = code.join(''); // 6자리 코드로 조합
    if (verificationCode.length !== 6) {
      alert(t('verify_alert_invalid_code')); // (★수정★) t함수 사용
      return;
    }
    
    setAuthStatus('loading'); 
    setAuthenticatedUser(null);

    try {
      // (★중요★) 백엔드에 새로 만들 인증번호 검증 API 호출
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kiosk_id: KIOSK_ID,
          phone_number: phone_number, // 원본 폰번호
          verification_id: verification_id, // 1단계에서 받은 인증 ID
          verification_code: verificationCode // 사용자가 입력한 6자리 코드
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS' && data.is_authenticated) {
          // ★최종 인증 성공★
          console.log('API 응답 (Code Verify): 성공', data);
          // (★중요★) 최종 토큰 및 사용자 정보 저장
          localStorage.setItem('session_token', data.session_token); 
          localStorage.setItem('fisherman_name', data.fisherman_info.name);
          setAuthenticatedUser(data.fisherman_info); 
          setAuthStatus('success'); // 성공 팝업 표시
      } else {
          // 실패 (코드가 틀리거나, 시간 초과)
          console.warn('API 응답 (Code Verify): 실패', data);
          setAuthStatus('failed'); // 실패 팝업 표시
      }
    } catch (error) {
        console.error('API 요청 오류 (Code Verify):', error);
        setAuthStatus('failed'); 
        alert(t('error_server_communication')); // (★수정★) t함수 사용
    }
  };

  // --- 이전 화면(번호 입력)으로 돌아가기 ---
  const handleGoBack = () => {
    navigate('/auth/alternate-auth'); 
  };
  
  // (인증번호 재전송 - 1단계 API 재호출)
  const handleResend = () => {
      // (간단 버전) 이전 화면으로 보내기 (사용자가 번호 다시 누르고 오도록)
      navigate('/auth/alternate-auth');
      // (고급 버전) /api/auth/alternate API를 여기서 다시 호출 (추가 구현 필요)
  };


  // --- 인라인 스타일 (CSS 대신) ---
  const containerStyle = { padding: '20px', fontFamily: 'sans-serif' };
  const progressStepsStyle = { display: 'flex', justifyContent: 'space-around', marginBottom: '10px' };
  const stepItemStyle = { padding: '8px 12px', borderRadius: '15px', color: '#888' };
  const activeStepStyle = { ...stepItemStyle, background: '#007bff', color: 'white' };
  const inactiveStepStyle = { ...stepItemStyle, background: '#eee' };
  const progressBarWrapperStyle = { background: '#eee', height: '8px', borderRadius: '4px', position: 'relative', marginBottom: '5px' };
  const progressBarLineStyle = { background: '#28a745', height: '100%', borderRadius: '4px' };
  const progressBarIndicatorStyle = { position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', width: '16px', height: '16px', background: '#28a745', borderRadius: '50%', border: '2px solid white' };
  const progressBarLabelStyle = { display: 'block', textAlign: 'right', fontSize: '0.9em', color: '#555', marginBottom: '20px' };
  const authBoxStyle = { background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' };
  const authBoxHeaderStyle = { marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' };
  const authTitleStyle = { margin: '0', fontSize: '1.8em' };
  const authBoxContentStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' };
  const mascotStyle = { width: '100px', height: 'auto' };
  const instructionStyle = { fontSize: '1.2em', margin: '0', whiteSpace: 'pre-line' };
  const phoneDisplayStyle = { fontSize: '1.2rem', color: '#555', fontWeight: 'bold' };
  const codeInputContainerStyle = { display: 'flex', gap: '10px', margin: '20px 0' };
  const codeInputStyle = { width: '40px', height: '50px', fontSize: '2rem', textAlign: 'center', border: '1px solid #ccc', borderRadius: '8px' };
  const actionButtonGroupStyle = { display: 'flex', gap: '15px', width: '100%', maxWidth: '400px', marginTop: '15px' };
  const actionButtonStyle = { flex: 1, padding: '15px', fontSize: '1.1em', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' };
  const primaryButtonStyle = { ...actionButtonStyle, background: '#007bff', color: 'white' };
  const secondaryButtonStyle = { ...actionButtonStyle, background: '#6c757d', color: 'white' };
  const linkButtonStyle = { ...actionButtonStyle, background: 'none', color: '#007bff', padding: '10px', fontSize: '1em' };
  const footerStyle = { textAlign: 'right', marginTop: '20px', color: '#555' };

  // 6자리 코드가 모두 입력되었는지 확인
  const isCodeComplete = code.every(c => c !== '');

  return (
    <div className="alt-auth-container" style={containerStyle}>
      {/* 1. 상단 진행 단계 */}
      <div className="progress-steps" style={progressStepsStyle}>
        <div className="step-item active" style={activeStepStyle}>{t('auth_step_1')}</div>
        <div className="step-item inactive" style={inactiveStepStyle}>{t('auth_step_2')}</div>
        <div className="step-item inactive" style={inactiveStepStyle}>{t('auth_step_3')}</div>
      </div>
      <div className="progress-bar-wrapper" style={progressBarWrapperStyle}>
        <div className="progress-bar-line" style={{...progressBarLineStyle, width: '33.33%'}}></div>
        <div className="progress-bar-indicator" style={{...progressBarIndicatorStyle, left: '33.33%'}}></div>
      </div>
      <span className="progress-bar-label" style={progressBarLabelStyle}>{t('auth_step_label')}</span>

      {/* 2. 메인 인증 박스 */}
      <div className="auth-box" style={authBoxStyle}>
        <div className="auth-box-header" style={authBoxHeaderStyle}>
          <h1 className="auth-title" style={authTitleStyle}>{t('verify_title')}</h1>
        </div>
        <div className="auth-box-content" style={authBoxContentStyle}>
          <img src={MascotImage} alt={t('auth_mascot_alt')} className="auth-mascot" style={mascotStyle} />

          <p className="auth-instruction" style={instructionStyle}>
            {t('verify_instruction_prefix')}
            <strong style={phoneDisplayStyle}>{masked_phone_number || '...'}</strong>
            {t('verify_instruction_suffix')}
          </p>

          {/* 인증번호 6자리 입력창 */}
          <div className="code-input-container" style={codeInputContainerStyle}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="tel" // 숫자 키패드 유도
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={authStatus === 'loading'}
                style={codeInputStyle}
              />
            ))}
          </div>

          {/* 하단 버튼 */}
          <div className="action-button-group" style={actionButtonGroupStyle}>
            <button
              className="action-button secondary"
              style={linkButtonStyle}
              onClick={handleGoBack}
              disabled={authStatus === 'loading'}
            >
              {t('verify_goback_button')}
            </button>
            <button
              className="action-button primary"
              style={primaryButtonStyle}
              onClick={handleVerifySubmit}
              disabled={authStatus === 'loading' || !isCodeComplete} // 6자리 모두 입력해야 활성화
            >
              {t('verify_submit_button')}
            </button>
            <button
              className="action-button secondary"
              style={linkButtonStyle}
              onClick={handleResend} // (현재는 뒤로가기)
              disabled={authStatus === 'loading'}
            >
              {t('verify_resend_button')}
            </button>
          </div>
        </div>
      </div>

      {/* 3. 하단 담당자 연락처 */}
      <footer className="auth-footer" style={footerStyle}>
        <span className="contact-info">{t('auth_contact_label')} 010-0000-0000</span>
      </footer>

      {/* --- 팝업 렌더링 --- */}
      {authStatus === 'loading' && <LoadingOverlay />}
      {authStatus === 'success' && <AuthSuccessPopup userInfo={authenticatedUser} />} 
      {authStatus === 'failed' && (
        <VerifyFailPopup
          onRetry={() => {
            setAuthStatus('idle'); 
            setCode(['', '', '', '', '', '']); // 코드 초기화
            if (inputRefs.current[0]) { // (★안정성★) ref가 준비되었는지 확인
                inputRefs.current[0].focus(); // 첫 번째 칸으로 포커스
            }
          }}
        />
      )}
    </div>
  );
};

export default VerifyCodeScreen;