// src/adminPage/AdminScreen.jsx (★사진 모달 기능 추가됨★)

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './AdminScreen.css'; // 관리자 페이지 전용 CSS
import LoadingSpinner from '../assets/loading-spinner.png'; // 로딩 스피너 재사용

// --- 로딩 오버레이 ---
const LoadingOverlay = () => {
  const { t } = useTranslation();
  return (
    // (★) adm- 접두사로 변경
    <div className="adm-loading-overlay">
      <img src={LoadingSpinner} alt={t('auth_loading_alt')} className="adm-loading-spinner" />
    </div>
  );
};

// --- (★신규★) 사진 보기 모달 컴포넌트 ---
const PhotoModal = ({ imageUrls, onClose }) => {
  if (!imageUrls || imageUrls.length === 0) return null;

  return (
    <div className="adm-photo-modal-overlay" onClick={onClose}>
      <div className="adm-photo-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="adm-photo-modal-close-button" onClick={onClose}>&times;</button>
        {imageUrls.map((url, index) => (
          <img
            key={index}
            src={url}
            alt={`Return visual ${index + 1}`}
            className="adm-photo-modal-image"
          />
        ))}
      </div>
    </div>
  );
};


// --- 목록 펼치기 컴포넌트 ---
const ExpandableList = ({ items, itemType = 'code' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) {
    return <span>-</span>;
  }

  const listItems = items.map(item => (typeof item === 'object' ? item[itemType] : item));

  return (
    // (★) adm- 접두사로 변경
    <div className="adm-expandable-list">
      <button onClick={() => setIsExpanded(!isExpanded)} className="adm-expandable-button">
        {isExpanded ? '▲ 접기' : `▼ ${listItems.length}건 보기`}
      </button>
      {isExpanded && (
        <ul className="adm-expandable-ul">
          {listItems.map((item, index) => (
            <li key={index} className="adm-expandable-li">{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- 대여 확인 모달 컴포넌트 ---
const BorrowModal = ({ gearCode, allFishermen, onConfirm, onCancel, isLoading }) => {
  const [selectedFishermanId, setSelectedFishermanId] = useState(allFishermen[0]?.id || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFishermanId) {
      onConfirm(gearCode, selectedFishermanId);
    } else {
      alert('대여할 어부를 선택하세요.');
    }
  };

  return (
    // (★) adm- 접두사로 변경 (고유 클래스 사용)
    <div className="adm-modal-overlay">
      <div className="adm-modal-content">
        <h2 className="adm-modal-title">어구 대여하기</h2>
        <form onSubmit={handleSubmit} className="adm-modal-form">
          <div>
            <p><strong>{gearCode}</strong> 어구를<br />어떤 어부에게 대여하시겠습니까?</p>
            <select
              value={selectedFishermanId}
              onChange={(e) => setSelectedFishermanId(e.target.value)}
              className="adm-modal-select"
              disabled={isLoading}
            >
              {allFishermen.map(f => (
                <option key={f.id} value={f.id}>{f.name} (ID: {f.id})</option>
              ))}
            </select>
          </div>
          <div className="adm-modal-actions">
            <button type="button" className="adm-modal-button adm-modal-button--secondary" onClick={onCancel} disabled={isLoading}>
              취소
            </button>
            <button type="submit" className="adm-modal-button" disabled={isLoading}>
              {isLoading ? '처리중...' : '대여 확정'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- 메인 관리자 화면 컴포넌트 ---
const AdminScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // --- State ---
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [kioskStatus, setKioskStatus] = useState(null);
  const [returnHistory, setReturnHistory] = useState([]);
  const [fishermen, setFishermen] = useState([]);
  const [gearList, setGearList] = useState([]);
  const [borrowModalInfo, setBorrowModalInfo] = useState(null);

  // (★신규★) 사진 모달 State
  const [photoModalUrls, setPhotoModalUrls] = useState([]);

  // --- API 호출 핸들러 ---

  // 1. 로그인
  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('${process.env.REACT_APP_API_URL}/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        setAdminToken(data.token);
        setUsername('');
        setPassword('');
        setActiveTab('dashboard');
      } else {
        setError(data.message || t('admin_login_fail_message', '아이디 또는 비밀번호가 일치하지 않습니다.'));
      }
    } catch (err) {
      console.error('Admin Login API Error:', err);
      setError(t('error_server_communication'));
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 로그아웃
  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin_token');
    setKioskStatus(null);
    setReturnHistory([]);
    setFishermen([]);
    setGearList([]);
  };

  // 3. 탭에 맞는 데이터 불러오기
  const fetchDataForTab = async (tab, options = { manageLoading: true }) => {
    if (!adminToken) return;

    if (options.manageLoading) {
      setIsLoading(true);
    }

    const headers = { 'Authorization': `Bearer ${adminToken}` };
    let url = '';

    try {
      if (tab === 'dashboard' && !kioskStatus) {
        url = `${process.env.REACT_APP_API_URL}/api/admin/status`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('Failed to fetch status');
        setKioskStatus(await res.json());

      } else if (tab === 'fishermen' && fishermen.length === 0) {
        url = `${process.env.REACT_APP_API_URL}/api/admin/fishermen`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('Failed to fetch fishermen');
        setFishermen(await res.json());

      } else if (tab === 'gear' && gearList.length === 0) {
        url = `${process.env.REACT_APP_API_URL}/api/admin/gear`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('Failed to fetch gear');
        setGearList(await res.json());

      } else if (tab === 'history' && returnHistory.length === 0) {
        url = `${process.env.REACT_APP_API_URL}/api/admin/history`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('Failed to fetch history');
        setReturnHistory(await res.json());
      }
    } catch (err) {
      console.error(`Fetch Data Error (Tab: ${tab}, URL: ${url}):`, err);
      handleLogout();
    } finally {
      if (options.manageLoading) {
        setIsLoading(false);
      }
    }
  };

  // 4. 대여 버튼 클릭 시 (모달 열기)
  const handleBorrow = (gearCode) => {
    if (fishermen.length === 0) {
      alert('어부 목록을 먼저 불러와야 합니다. \'어부 관리\' 탭을 클릭하여 데이터를 로드하세요.');
      setActiveTab('fishermen');
      return;
    }
    setBorrowModalInfo({ gearCode: gearCode });
  };

  // 5. 모달에서 [대여 확정] 버튼 클릭 시 (API 호출)
  const handleConfirmBorrow = async (gearCode, fishermanId) => {
    if (!adminToken) {
      alert('세션이 만료되었습니다. 다시 로그인해 주세요.');
      handleLogout();
      return;
    }

    console.log(`[대여 요청] Gear: ${gearCode}, Fisherman ID: ${fishermanId}`);
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/gear/borrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          gear_code: gearCode,
          fisherman_id: parseInt(fishermanId, 10)
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        alert('대여 처리가 완료되었습니다.');
        setGearList([]);
        setFishermen([]);
        await fetchDataForTab('gear', { manageLoading: false });
        await fetchDataForTab('fishermen', { manageLoading: false });
      } else {
        throw new Error(data.message || '대여 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error('Handle Borrow Error:', err);
      alert(`오류: ${err.message}`);
    } finally {
      setIsLoading(false);
      setBorrowModalInfo(null);
    }
  };

  // (★신규★) 6. 사진 보기 버튼 클릭
  const handlePhotoClick = (photoFilenames) => {
    // 서버 주소와 파일명을 조합하여 전체 URL 배열 생성
    const fullUrls = photoFilenames.map(filename =>
      `${process.env.REACT_APP_API_URL}/uploads/${filename}`
    );
    setPhotoModalUrls(fullUrls);
  };

  // --- Effect ---
  useEffect(() => {
    if (adminToken) {
      fetchDataForTab('dashboard');
      // (★) 로그인 시 어부 목록 미리 로드 (충돌 방지)
      fetchDataForTab('fishermen', { manageLoading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  useEffect(() => {
    if (adminToken) {
      fetchDataForTab(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, adminToken]);


  // --- 렌더링 헬퍼 ---

  // 1. 로그인 화면 렌더링
  const renderLogin = () => (
    <div className="adm-login-container">
      <form className="adm-login-form" onSubmit={handleLogin}>
        <h1 className="adm-login-title">{t('admin_login_title', '관리자 로그인')}</h1>
        {error && <p className="adm-login-error">{error}</p>}
        <input
          type="text"
          className="adm-login-input"
          placeholder={t('admin_login_username_placeholder', '사용자 ID')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          className="adm-login-input"
          placeholder={t('admin_login_password_placeholder', '비밀번호')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="adm-login-button" disabled={isLoading}>
          {t('admin_login_button', '로그인')}
        </button>
        <button
          type="button"
          className="adm-login-button adm-login-button--secondary"
          onClick={() => navigate('/')}
        >
          {t('admin_login_goback_button', '돌아가기')}
        </button>
      </form>
    </div>
  );

  // 2. 탭 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardHome();
      case 'fishermen':
        return renderFishermenList();
      case 'gear':
        return renderGearList();
      case 'history':
        return renderHistoryList();
      default:
        return null;
    }
  };

  // 2-1. 대시보드 탭 (키오스크 상태)
  const renderDashboardHome = () => (
    <section className="adm-section">
      <h2 className="adm-section-title">{t('admin_dashboard_status_title', '키오스크 상태')}</h2>
      {kioskStatus ? (
        <div className="adm-kiosk-status">
          <p><strong>{t('admin_kiosk_name', '기기 이름')}:</strong> {kioskStatus.name} ({kioskStatus.kiosk_uid})</p>
          <p><strong>{t('admin_kiosk_location', '위치')}:</strong> {kioskStatus.location_area}</p>
          <p><strong>{t('admin_kiosk_status', '네트워크')}:</strong>
            <span className={`adm-status-badge adm-status-badge--${kioskStatus.status.toLowerCase()}`}>
              {kioskStatus.status}
            </span>
          </p>
          <p><strong>{t('admin_kiosk_storage', '저장용량')}:</strong>
            <span className={`adm-status-badge adm-status-badge--${kioskStatus.storage_status.toLowerCase()}`}>
              {kioskStatus.storage_status}
            </span>
          </p>
        </div>
      ) : <p>{t('admin_loading_data', '데이터 로드 중...')}</p>}
    </section>
  );

  // 2-2. 어부 목록 탭
  const renderFishermenList = () => (
    <section className="adm-section">
      <h2 className="adm-section-title">{t('admin_fishermen_title', '어부 목록')}</h2>
      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th>{t('admin_fishermen_id', 'ID')}</th>
              <th>{t('admin_fishermen_name', '이름')}</th>
              <th>{t('admin_fishermen_contact', '연락처')}</th>
              <th>{t('admin_fishermen_birthdate', '생년월일')}</th>
              <th>{t('admin_fishermen_status', '대여 상태')}</th>
              <th>{t('admin_fishermen_gear', '대여 중인 어구')}</th>
            </tr>
          </thead>
          <tbody>
            {fishermen.length > 0 ? (
              fishermen.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.contact}</td>
                  <td>{user.birthdate}</td>
                  <td>
                    <span className={`adm-status-badge ${user.borrowing_status === 'BORROWING' ? 'adm-status-badge--offline' : 'adm-status-badge--normal'
                      }`}>
                      {user.borrowing_status}
                    </span>
                  </td>
                  <td>
                    <ExpandableList items={user.borrowed_gear} />
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6">{t('admin_fishermen_no_data', '어부 정보가 없습니다.')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  // 2-3. 어구 목록 탭
  const renderGearList = () => (
    <section className="adm-section">
      <h2 className="adm-section-title">{t('admin_gear_title', '어구 마스터 목록')}</h2>
      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th>{t('admin_gear_code', '어구 코드')}</th>
              <th>{t('admin_gear_type', '종류')}</th>
              <th>{t('admin_gear_reward', '보상액')}</th>
              <th>{t('admin_gear_status', '상태')}</th>
              <th>{t('admin_gear_borrower', '대여자')}</th>
              <th>{t('admin_gear_action', '조치')}</th>
            </tr>
          </thead>
          <tbody>
            {gearList.length > 0 ? (
              gearList.map(gear => (
                <tr key={gear.code}>
                  <td>{gear.code}</td>
                  <td>{gear.type}</td>
                  <td>{gear.reward.toLocaleString()} 원</td>
                  <td>
                    <span className={`adm-status-badge ${gear.status === 'BORROWED' ? 'adm-status-badge--offline' : 'adm-status-badge--normal'
                      }`}>
                      {gear.status}
                    </span>
                  </td>
                  <td>{gear.fisherman_name || '-'}</td>
                  <td>
                    {gear.status === 'AVAILABLE' ? (
                      <button
                        className="adm-borrow-button"
                        onClick={() => handleBorrow(gear.code)}
                        disabled={isLoading}
                      >
                        대여하기
                      </button>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6">{t('admin_gear_no_data', '어구 정보가 없습니다.')}</td></tr>
            )}
          </tbody>
        </table>
      </div >
    </section >
  );

  // 2-4. 반납 내역 탭
  const renderHistoryList = () => {
    // (★수정★) 사진 파일명 파싱 로직 추가
    const getPhotoFilenames = (filenames) => {
      try {
        const parsed = JSON.parse(filenames || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    };

    return (
      <section className="adm-section">
        <h2 className="adm-section-title">{t('admin_dashboard_history_title', '최근 반납 내역')}</h2>
        <div className="adm-table-wrapper">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('admin_history_time', '반납 시간')}</th>
                <th>{t('admin_history_user', '사용자')}</th>
                <th>{t('admin_history_items', '반납 어구')}</th>
                <th>{t('admin_history_reward', '총 보상액')}</th>
                <th>{t('admin_history_photo', '사진')}</th>
              </tr>
            </thead>
            <tbody>
              {returnHistory.length > 0 ? (
                returnHistory.map(item => {
                  // (★수정★) 파일명 목록 파싱
                  const photoFiles = getPhotoFilenames(item.photo_filenames);
                  return (
                    <tr key={item.id}>
                      <td>{new Date(item.confirmed_at).toLocaleString()}</td>
                      <td>{item.fisherman_name}</td>
                      <td>
                        <ExpandableList
                          items={JSON.parse(item.returned_items || '[]')}
                          itemType="code"
                        />
                      </td>
                      <td>{item.total_deposit.toLocaleString()} 원</td>
                      <td>
                        {/* (★수정★) 파일이 있으면 클릭 가능한 버튼, 없으면 '-' */}
                        {photoFiles.length > 0 ? (
                          <button
                            className="adm-photo-thumbnail-button"
                            onClick={() => handlePhotoClick(photoFiles)}
                          >
                            📷 보기
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="5">{t('admin_history_no_data', '최근 반납 내역이 없습니다.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  };


  // 3. 대시보드 전체 레이아웃 렌더링
  const renderDashboard = () => (
    <div className="adm-dashboard">
      <header className="adm-dashboard-header">
        <h1 className="adm-dashboard-title">{t('admin_dashboard_title', '관리자 대시보드')}</h1>
        <button className="adm-dashboard-button adm-dashboard-button--logout" onClick={handleLogout}>
          {t('admin_dashboard_logout_button', '로그아웃')}
        </button>
      </header>

      <nav className="adm-tabs">
        <button
          className={`adm-tab-button ${activeTab === 'dashboard' ? 'adm-tab-button--active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          {t('admin_tab_dashboard', '대시보드')}
        </button>
        <button
          className={`adm-tab-button ${activeTab === 'fishermen' ? 'adm-tab-button--active' : ''}`}
          onClick={() => setActiveTab('fishermen')}
        >
          {t('admin_tab_fishermen', '어부 관리')}
        </button>
        <button
          className={`adm-tab-button ${activeTab === 'gear' ? 'adm-tab-button--active' : ''}`}
          onClick={() => setActiveTab('gear')}
        >
          {t('admin_tab_gear', '어구 관리')}
        </button>
        <button
          className={`adm-tab-button ${activeTab === 'history' ? 'adm-tab-button--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          {t('admin_tab_history', '반납 내역')}
        </button>
      </nav>

      <div className="adm-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );

  // --- 최종 렌더링 ---
  return (
    <div className="adm-screen">
      {isLoading && <LoadingOverlay />}
      {!adminToken ? renderLogin() : renderDashboard()}

      {/* (★수정★) 대여 모달 렌더링 */}
      {borrowModalInfo && (
        <BorrowModal
          gearCode={borrowModalInfo.gearCode}
          allFishermen={fishermen}
          onConfirm={handleConfirmBorrow}
          onCancel={() => setBorrowModalInfo(null)}
          isLoading={isLoading}
        />
      )}

      {/* (★신규★) 사진 모달 렌더링 */}
      {photoModalUrls.length > 0 && (
        <PhotoModal
          imageUrls={photoModalUrls}
          onClose={() => setPhotoModalUrls([])}
        />
      )}
    </div>
  );
};

export default AdminScreen;