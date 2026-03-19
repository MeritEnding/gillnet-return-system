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

/* 어구명 번역 매핑 테이블 */
const GEAR_NAME_MAP = {
  "원뿔대형(대게류·붉은대게류)의 통발": "gear_conical_crab_trap",
  "스프링이 설치된 장구형의 통발": "gear_spring_drum_trap",
  "기존사각통발(바코드)": "gear_existing_square_trap",
  "기존통발어구(바코드)": "gear_existing_trap_generic"
};

// --- [GearCard: 개별 어구 카드] ---
const GearCard = ({ gear, type, t, translateGearName }) => {
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

  const possibleList = data ? data.filter(item => item.return_status === '반환가능') : [];
  const completedList = data ? data.filter(item => item.return_status !== '반환가능') : [];
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
          <p className="gear-qty">{t('gear_quantity')}: <strong>{gear.quaty}</strong></p>
        </div>
      </div>

      <div className="rentals-card-content">
        <div className="rentals-divider"></div>
        
        {/* ★ [수정] 인라인 로딩 멘트 추가 */}
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
                   {activeTab === 'possible' ? (t('msg_no_returnable') || "반환 가능한 어구가 없습니다.") : (t('msg_no_returned') || "반환 완료된 내역이 없습니다.")}
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
            onClick={() => setActiveTab('deposit')}
          >
            {t('rentals_deposit_gear_tab')}
          </button>
          <button 
            className={`rentals-tab-item ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing')}
          >
            {t('rentals_existing_gear_tab')}
          </button>
        </div>

        {/* ★ [수정] 전체 로딩 멘트 추가 */}
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