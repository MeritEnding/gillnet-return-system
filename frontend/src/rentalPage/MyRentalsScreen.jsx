// src/rentalPage/MyRentalsScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import './MyRentalsScreen.css';
import Header from '../mainPage/Header';
import BgAll from '../assets/bg_all.png'; 

const API_BASE_URL = 'http://localhost:8080/api/v1/proxy';

/* 뒤로가기 아이콘 (SVG) */
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* 검색 돋보기 아이콘 (SVG) */
const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

/* 어구명 번역 매핑 테이블 */
const GEAR_NAME_MAP = {
  "원뿔대형(대게류·붉은대게류)의 통발": "gear_conical_crab_trap",
  "스프링이 설치된 장구형의 통발": "gear_spring_drum_trap",
  "기존사각통발(바코드)": "gear_existing_square_trap",
  "기존통발어구(바코드)": "gear_existing_trap_generic"
};

// --- [GearCard: 개별 어구 카드] ---
const GearCard = ({ gear, type, t, translateGearName, searchQuery }) => {
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null);
  const [data, setData] = useState(null); 
  const [activeTab, setActiveTab] = useState('possible'); 

  const id = type === 'deposit' ? gear.spmt_mng_no : gear.fsgr_reg_mng_no;
  const endpoint = type === 'deposit' 
    ? `${API_BASE_URL}/rentals/${id}/remg`
    : `${API_BASE_URL}/rentals/${id}/romg`;

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(endpoint);
        setData(response.data?.data?.barcodes || []);
      } catch (err) {
        setError(t('detail_fetch_error') || '정보를 불러올 수 없습니다.');
        console.error("Detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [endpoint, t]);

  // ★ [수정] 검색어(searchQuery)가 있으면 바코드 번호에 포함된 것만 필터링
  const filteredData = data ? data.filter(item => item.bacod_nm.includes(searchQuery)) : [];

  // ★ [추가] 검색어가 있는데 이 카드 안에 일치하는 바코드가 하나도 없으면 카드를 아예 숨김 처리
  if (searchQuery && !loading && data && filteredData.length === 0) {
    return null;
  }

  // 필터링된 데이터(filteredData)를 기준으로 탭 목록 생성
  const possibleList = filteredData.filter(item => item.return_status === '반환가능');
  const completedList = filteredData.filter(item => item.return_status !== '반환가능');
  const currentList = activeTab === 'possible' ? possibleList : completedList;

  const formatAmount = (item) => {
    const amount = item.grnte_amt || item.rmbr_pnt;
    if (amount) return `${Number(amount).toLocaleString()}원`;
    return '-';
  };

  return (
    <div className="rentals-gear-card">
      <div className="rentals-gear-header">
        <div className="rentals-gear-info">
          <p className="gear-name">{translateGearName(gear.fsgr_nm)}</p>
          {/* 검색 중일 때는 검색된 개수를, 아닐 때는 전체 개수를 표시 */}
          <p className="gear-qty">
            {t('gear_quantity')}: <strong>{searchQuery ? filteredData.length : gear.quaty}</strong>
          </p>
        </div>
      </div>

      <div className="rentals-card-content">
        <div className="rentals-divider"></div>
        
        {loading && (
          <div className="rentals-inline-loading">
            <div className="rentals-spinner small"></div>
            <p className="rentals-loading-text-inline">
              {t('msg_loading_details') || "상세 바코드 정보를 조회 중입니다..."}
            </p>
          </div>
        )}

        {error && <div className="rentals-error-msg-inline">{error}</div>}

        {!loading && !error && data && (
          <>
            <div className="rentals-inline-tabs">
              <button 
                className={`rentals-inline-tab-btn ${activeTab === 'possible' ? 'active possible' : ''}`}
                onClick={() => setActiveTab('possible')}
              >
                {t('status_returnable') || '반환 가능'} 
                <span className="rentals-tab-count">{possibleList.length}</span>
              </button>
              <button 
                className={`rentals-inline-tab-btn ${activeTab === 'completed' ? 'active completed' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                {t('status_returned') || '반환 완료'}
                <span className="rentals-tab-count">{completedList.length}</span>
              </button>
            </div>

            <div className="rentals-inline-list">
              {currentList.length > 0 ? (
                currentList.map((barcode, index) => (
                  <div key={index} className={`rentals-barcode-item ${activeTab}`}>
                    <div className="rentals-barcode-info">
                      <div className="info-row">
                        <span className="rentals-label">{t('barcode_label') || '바코드'}</span>
                        <span className="rentals-value-code">{barcode.bacod_nm}</span>
                      </div>
                      <div className="info-row sub-info">
                        <span className="rentals-label-sub">
                           {barcode.grnte_amt ? (t('deposit_amount') || '보증금') : (t('point_amount') || '포인트')}
                        </span>
                        <span className="rentals-value-money">
                           {formatAmount(barcode)}
                        </span>
                      </div>
                    </div>
                    <span className={`rentals-status-badge ${activeTab}`}>
                      {barcode.return_status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rentals-empty-inline">
                   {searchQuery 
                     ? (t('msg_no_search_result') || "검색된 바코드가 없습니다.") 
                     : (activeTab === 'possible' ? (t('msg_no_returnable') || "반환 가능한 어구가 없습니다.") : (t('msg_no_returned') || "반환 완료된 내역이 없습니다."))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- [Main Component] ---
const MyRentalsScreen = () => {
  const { t } = useTranslation(); 
  const navigate = useNavigate();

  const [fishermanId, setFishermanId] = useState(null);
  const [fishermanName, setFishermanName] = useState(null);
  const [activeTab, setActiveTab] = useState('deposit'); 

  // ★ [추가] 검색어 상태 관리
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [depositGears, setDepositGears] = useState([]); 
  const [existingGears, setExistingGears] = useState([]); 

  const handleGoBack = () => {
    navigate('/auth'); 
  };

  useEffect(() => {
    if (!fishermanId) { 
      const fId = localStorage.getItem('fisherman_id');
      const fName = localStorage.getItem('fisherman_name');

      if (!fId) {
        navigate('/auth');
        return;
      }
      setFishermanId(fId);
      setFishermanName(fName);
    }
  }, [navigate, fishermanId]); 

  const fetchData = useCallback(async () => {
    const mbrNo = localStorage.getItem('mbr_no');
    if (!mbrNo) return;

    setLoading(true);
    setError(null);
    try {
      const [remgResponse, romgResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/user/${mbrNo}/rentals/remg`),
        axios.get(`${API_BASE_URL}/user/${mbrNo}/rentals/romg`)
      ]);

      setDepositGears(remgResponse.data?.data?.list || []);
      setExistingGears(romgResponse.data?.data?.list || []);

    } catch (err) {
      setError(t('rentals_fetch_error'));
      console.error("Error fetching rental data:", err);
    } finally {
      setLoading(false);
    }
  }, [fishermanId, t]);

  useEffect(() => {
    if (fishermanId) {
      fetchData();
    }
  }, [fetchData, fishermanId]); 

  const translateGearName = (koreanName) => {
    const translationKey = GEAR_NAME_MAP[koreanName];
    return translationKey ? t(translationKey) : koreanName;
  };

  const handleProceed = () => {
    navigate('/certificationPage/scan');
  };

  // 탭 변경 시 검색어 초기화
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  return (
    <div className="rentals-page-wrapper" style={{ backgroundImage: `url(${BgAll})` }}>
      
      <button className="rentals-back-btn" onClick={handleGoBack}>
        <BackIcon />
        <span className="rentals-back-text">{t('go_home') || '뒤로가기'}</span>
      </button>

      <Header fishermanName={fishermanName} /> 
      
      <div className="rentals-main-container">
        <h1 className="rentals-page-title">
          {fishermanName ? `${fishermanName}${t('rentals_title_suffix')}` : t('rentals_title')}
        </h1>

        <div className="rentals-tab-group">
          <button 
            className={`rentals-tab-item ${activeTab === 'deposit' ? 'active' : ''}`}
            onClick={() => handleTabChange('deposit')}
          >
            {t('rentals_deposit_gear_tab')}
          </button>
          <button 
            className={`rentals-tab-item ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => handleTabChange('existing')}
          >
            {t('rentals_existing_gear_tab')}
          </button>
        </div>

        {/* ★ [추가] 바코드 검색 입력창 */}
        <div className="rentals-search-box">
          <SearchIcon />
          <input 
            type="text" 
            className="rentals-search-input"
            placeholder={t('search_barcode_placeholder') || "바코드 번호 검색 (터치하여 입력)"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="rentals-search-clear-btn" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>

        {loading && (
          <div className="rentals-loading-overlay">
            <div className="rentals-loading-content">
              <div className="rentals-spinner large"></div>
              <p className="rentals-loading-text-main">
                {t('msg_loading_rentals') || "대여 목록을 불러오는 중입니다..."}
              </p>
            </div>
          </div>
        )}

        {error && <div className="rentals-error-message">{error}</div>}
        
        {!loading && !error && (
          <div className="rentals-scroll-area">
            {activeTab === 'deposit' && (
              <div className="rentals-gear-list">
                {depositGears.length > 0 ? (
                  depositGears.map((gear) => (
                    <GearCard 
                      key={gear.spmt_mng_no} 
                      gear={gear} 
                      type="deposit" 
                      t={t}
                      translateGearName={translateGearName}
                      searchQuery={searchQuery} /* ★ 검색어 전달 */
                    />
                  ))
                ) : (
                  <p className="rentals-no-data-msg">{t('no_deposit_gear_found')}</p>
                )}
              </div>
            )}

            {activeTab === 'existing' && (
              <div className="rentals-gear-list">
                {existingGears.length > 0 ? (
                  existingGears.map((gear) => (
                    <GearCard 
                      key={gear.fsgr_reg_mng_no} 
                      gear={gear} 
                      type="existing" 
                      t={t}
                      translateGearName={translateGearName}
                      searchQuery={searchQuery} /* ★ 검색어 전달 */
                    />
                  ))
                ) : (
                  <p className="rentals-no-data-msg">{t('no_existing_gear_found')}</p>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="rentals-btn-container">
          <button className="rentals-proceed-btn" onClick={handleProceed}>
            {t('proceed_to_return_button')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MyRentalsScreen;