// src/mainPage/modals/AuthChoiceModal.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import PassLogo from '../../assets/PassLogo.png';

const AuthChoiceModal = ({ onClose, onQr, onPass, onLogin }) => {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content auth-choice-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
        <h2 className="modal-title">{t('auth_choice_title') || '사용자 인증 방법 선택'}</h2>
        
        {/* ★ 비회원 안내 문구 추가 ★ */}
        <p className="auth-nonmember-guide">
          비회원님은 오른쪽의 <strong>'PASS 인증'</strong>으로 진행해 주세요.
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
              <span className="auth-main-text">{t('auth_qr_btn_main') || '회원인증'}</span>
              <span className="auth-sub-text">{t('auth_qr_btn_sub') || '(QR 코드)'}</span>
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
              <span className="auth-main-text">아이디 로그인</span>
              <span className="auth-sub-text">비밀번호로 인증합니다</span>
            </div>
          </button>

          {/* 3) PASS 인증 */}
          <button className="modal-btn btn-pass-large" onClick={onPass}>
            <div className="btn-icon-area-large pass-logo-wrap-large">
              <img src={PassLogo} alt="PASS" className="pass-logo-img-large" draggable={false} />
            </div>
            <div className="btn-text-area-large">
              <span className="auth-main-text">{t('auth_pass_btn_main') || 'PASS 인증'}</span>
              <span className="auth-sub-text">{t('auth_pass_btn_sub') || '(휴대폰 본인인증)'}</span>
            </div>
          </button>

        </div>

        <p className="auth-guide-text">{t('auth_register_guide') || '회원 등록은 전용 앱이나 웹을 통해 가능합니다.'}</p>
      </div>
    </div>
  );
};

export default AuthChoiceModal;