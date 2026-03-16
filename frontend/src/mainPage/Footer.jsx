import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

// 아이콘 SVG
const HomeIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);

const BackIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
);

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // 메인 화면('/')에서는 푸터를 숨김
  if (location.pathname === '/') return null;

  // [처음으로] 버튼 핸들러
  const handleGoHome = () => {
    if (window.confirm("처음 화면으로 돌아가시겠습니까?\n진행 중인 내용은 저장되지 않습니다.")) {
      window.speechSynthesis.cancel();
      // 필요한 세션/로컬스토리지 정리
      localStorage.removeItem('session_token');
      localStorage.removeItem('return_session_id');
      localStorage.removeItem('fisherman_name');
      navigate('/');
    }
  };

  // [이전 단계] 버튼 핸들러 (요청하신 경로 매핑 적용)
  const handleBack = () => {
    window.speechSynthesis.cancel(); // 페이지 이동 시 음성 안내 중단

    // 현재 경로(location.pathname)에 따라 이동할 경로 결정
    switch (location.pathname) {
      case '/auth':
        navigate('/'); // 사용자 인증 -> 메인
        break;

      case '/my-rentals':
        navigate('/auth'); // 대여 목록 -> 사용자 인증
        break;

      case '/certificationPage/scan':
        navigate('/my-rentals'); // QR 스캔 -> 대여 목록
        break;

      case '/certificationPage/gear-scan':
        navigate('/certificationPage/scan'); // 어구 스캔 -> QR 스캔
        break;

      case '/deposit':
        // 주의: 반납 화면에서 뒤로 가면 기존 스캔 데이터가 필요할 수 있음 (상태 관리에 따라 다름)
        navigate('/certificationPage/gear-scan'); // 투입 -> 어구 스캔
        break;

      case '/completion':
        navigate('/deposit'); // 완료 -> 투입 (보통 완료에서는 홈으로 가지만 요청하신 대로 설정)
        break;

      default:
        navigate(-1); // 그 외의 페이지는 브라우저 히스토리 뒤로가기
        break;
    }
  };

  return (
    <footer className="common-footer">
      <div className="footer-btn-container">
        
        {/* 이전 단계 버튼 */}
        <button className="footer-btn btn-back" onClick={handleBack}>
          <BackIcon />
          <span>{t('btn_back') || "이전 단계"}</span>
        </button>

        {/* 처음으로 버튼 */}
        <button className="footer-btn btn-home" onClick={handleGoHome}>
          <HomeIcon />
          <span>{t('btn_home') || "처음으로"}</span>
        </button>

      </div>
    </footer>
  );
};

export default Footer;