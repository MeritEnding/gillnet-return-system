import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../assets/loading-spinner.png';

const PROXY_API_URL = 'http://localhost:8080/api/v1/proxy';

const ReturnProcessModal = ({ onClose }) => {
  const navigate = useNavigate();
  
  // 모달 단계: 1(계좌 확인) -> 2(어구 선택)
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // 계좌 관련 상태
  const [banks, setBanks] = useState([]);
  const [accountData, setAccountData] = useState({
    bankCd: '',
    actno: '',
    acctNm: ''
  });

  useEffect(() => {
    // 1. 은행 목록 API 호출
    axios.get(`${PROXY_API_URL}/banks`).then(res => {
      if (res.data?.data?.banks) setBanks(res.data.data.banks);
    }).catch(err => console.error("은행 목록 로드 실패", err));

    // 2. 인증 시 저장된 기존 정보 불러오기
    setAccountData({
      bankCd: localStorage.getItem('user_bank_cd') || '',
      actno: localStorage.getItem('user_actno') || '',
      acctNm: localStorage.getItem('user_acct_nm') || localStorage.getItem('fisherman_name') || ''
    });
  }, []);

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountData(prev => ({ ...prev, [name]: value }));
  };

  // [STEP 1] 계좌 인증 처리
  const handleVerifyAccount = async () => {
    if (!accountData.bankCd || !accountData.actno || !accountData.acctNm) {
      return alert("모든 계좌 정보를 입력해주세요.");
    }
    
    setIsLoading(true);
    try {
      const res = await axios.post(`${PROXY_API_URL}/account/verify`, {
        bank_cd: accountData.bankCd, 
        actno: accountData.actno, 
        acct_nm: accountData.acctNm
      });

      // API v1.2 기준 (테스트 서버는 무조건 성공 응답)
      if (res.data?.data?.success || res.data?.status === "200" || res.data?.status === 200) {
        localStorage.setItem('user_bank_cd', accountData.bankCd);
        localStorage.setItem('user_actno', accountData.actno);
        localStorage.setItem('user_acct_nm', accountData.acctNm);
        
        // 계좌 인증 성공 시 부드럽게 2단계(어구 선택)로 이동
        setStep(2);
      } else {
        alert("계좌 인증에 실패했습니다.");
      }
    } catch (error) {
      alert("계좌 인증 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // [STEP 2] 어구 선택 및 반환 시작 (Start API 호출)
  const handleSelectGear = async (gearType, fsgrClsfCd) => {
    setIsLoading(true);
    try {
      const payload = {
        user_fshnd_no: localStorage.getItem('fisherman_id'),
        mbr_no: localStorage.getItem('mbr_no'),
        fsgr_clsf_cd: fsgrClsfCd,
        korn_flnm: localStorage.getItem('fisherman_name'),
        brdt: (localStorage.getItem('user_brdt') || "19800101").replace(/-/g, ''), // 하이픈 제거
        mbl_telno: localStorage.getItem('user_phone') || "01000000000",
        bank_cd: accountData.bankCd,
        actno: accountData.actno,
        acct_nm: accountData.acctNm
      };

      // 반환 시작(Start) 통신!
      const res = await axios.post(`${PROXY_API_URL}/deposit/return/${gearType}/start`, payload);
      
      const mngNo = gearType === 'remg' 
        ? res.data?.data?.gvbk_mng_no 
        : res.data?.data?.bfr_fsgr_gvbk_no;

      if (!mngNo) throw new Error("서버로부터 반환 관리번호를 받지 못했습니다.");

      // 다음 스캔 화면에서 사용할 관리번호 저장
      localStorage.setItem('current_gear_type', gearType); 
      localStorage.setItem('current_mng_no', mngNo);       

      // 모달이 할 일은 끝! 스캔 화면으로 이동
      navigate('/certificationPage/gear-scan'); 
      
    } catch (error) {
      console.error(error);
      alert("반환 시작 처리에 실패했습니다.\n" + (error.response?.data?.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalContent}>
        <button style={styles.closeBtn} onClick={onClose} disabled={isLoading}>X</button>

        {isLoading ? (
          <div style={styles.loadingBox}>
            <img src={LoadingSpinner} alt="loading" className="spin-icon" style={{ width: '80px', marginBottom: '20px' }} />
            <h3 style={{ fontSize: '1.8rem', color: '#333' }}>서버와 통신 중입니다...</h3>
            <p style={{ color: '#666' }}>잠시만 기다려주세요.</p>
          </div>
        ) : (
          <>
            {/* STEP 1: 계좌 선택 화면 */}
            {step === 1 && (
              <div style={styles.stepContainer}>
                <h2 style={styles.title}>환급받을 계좌를 확인해주세요</h2>
                <div style={styles.inputGroup}>
                  <select name="bankCd" value={accountData.bankCd} onChange={handleAccountChange} style={styles.input}>
                    <option value="">은행 선택</option>
                    {banks.map(b => (
                      <option key={b.bank_cd} value={b.bank_cd}>{b.bank_nm}</option>
                    ))}
                  </select>
                  <input type="text" name="actno" placeholder="계좌번호 (- 제외)" value={accountData.actno} onChange={handleAccountChange} style={styles.input} />
                  <input type="text" name="acctNm" placeholder="예금주명" value={accountData.acctNm} onChange={handleAccountChange} style={styles.input} />
                </div>
                <button onClick={handleVerifyAccount} style={styles.primaryBtn}>
                  계좌 인증 및 다음으로
                </button>
              </div>
            )}

            {/* STEP 2: 어구 선택 화면 */}
            {step === 2 && (
              <div style={styles.stepContainer}>
                <h2 style={styles.title}>반환하실 어구를 선택해주세요</h2>
                <div style={styles.gearLayout}>
                  
                  {/* 보증금어구 */}
                  <div style={styles.gearCard}>
                    <h3 style={{ color: '#007BFF', marginBottom: '15px' }}>보증금어구 반환</h3>
                    <div style={styles.gridBtnGroup}>
                      <button onClick={() => handleSelectGear('remg', 'FISGE')} style={styles.gearBtn}>통발 어구</button>
                      <button onClick={() => handleSelectGear('remg', 'EELTP')} style={styles.gearBtn}>장어통발 어구</button>
                      <button onClick={() => handleSelectGear('remg', 'GILNT')} style={styles.gearBtn}>자망 어구</button>
                      <button onClick={() => handleSelectGear('remg', 'ABUOY')} style={styles.gearBtn}>부표 어구</button>
                    </div>
                  </div>

                  {/* 기존어구 */}
                  <div style={styles.gearCard}>
                    <h3 style={{ color: '#28a745', marginBottom: '15px' }}>기존어구 반환</h3>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button onClick={() => handleSelectGear('romg', 'FISGE')} style={styles.gearBtn}>통발 어구<br/>(기존)</button>
                    </div>
                  </div>

                </div>
                <button onClick={() => setStep(1)} style={styles.secondaryBtn}>이전 (계좌 다시 입력)</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// 모달 인라인 스타일
const styles = {
  backdrop: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  },
  modalContent: {
    backgroundColor: '#fff', width: '800px', minHeight: '500px',
    borderRadius: '20px', padding: '40px', position: 'relative',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center'
  },
  closeBtn: {
    position: 'absolute', top: '20px', right: '30px', fontSize: '2rem',
    background: 'none', border: 'none', cursor: 'pointer', color: '#999'
  },
  stepContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' },
  title: { fontSize: '2rem', color: '#333', marginBottom: '30px', textAlign: 'center' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '400px' },
  input: { padding: '15px', fontSize: '1.2rem', borderRadius: '10px', border: '1px solid #ddd' },
  primaryBtn: {
    padding: '20px 40px', marginTop: '40px', fontSize: '1.4rem', fontWeight: 'bold',
    background: '#007BFF', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', width: '100%', maxWidth: '400px'
  },
  secondaryBtn: {
    padding: '15px 30px', marginTop: '30px', fontSize: '1.2rem',
    background: '#6c757d', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer'
  },
  gearLayout: { display: 'flex', gap: '30px', width: '100%', justifyContent: 'center' },
  gearCard: { flex: 1, padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '15px', border: '1px solid #e9ecef', textAlign: 'center' },
  gridBtnGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  gearBtn: { padding: '20px', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#fff', border: '2px solid #dee2e6', borderRadius: '10px', cursor: 'pointer' },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px' }
};

export default ReturnProcessModal;