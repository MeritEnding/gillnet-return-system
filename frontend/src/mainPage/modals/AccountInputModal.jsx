// src/mainPage/modals/AccountInputModal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AccountInputModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [bankCd, setBankCd] = useState('');
  const [actno, setActno] = useState('');
  const [acctNm, setAcctNm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 컴포넌트가 열릴 때 은행 목록 조회 [cite: 108, 109]
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await axios.get('http://localhost:8080/api/v1/proxy/banks');
        if (res.data?.data?.banks) {
          setBanks(res.data.data.banks);
        }
      } catch (err) {
        console.error('은행 목록 로드 실패', err);
      }
    };
    fetchBanks();
  }, []);

  // 계좌 인증 처리 [cite: 134, 135, 154]
  const handleVerifyAccount = async () => {
    if (!bankCd || !actno || !acctNm) {
      alert("은행, 계좌번호, 예금주명을 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 계좌 인증 API 호출 [cite: 135, 156, 157, 158]
      const res = await axios.post('http://localhost:8080/api/v1/proxy/account/verify', {
        bank_cd: bankCd,
        actno: actno.replace(/-/g, ''), // 하이픈 제거
        acct_nm: acctNm
      });

      // 인증 성공 시 (테스트 서버는 무조건 성공 처리됨) [cite: 136, 170]
      if (res.data?.status === "200" || res.data?.data?.success) {
        // 성공한 데이터를 localStorage에 정확히 저장!
        localStorage.setItem('bank_cd', res.data.data.bank_cd || bankCd);
        localStorage.setItem('actno', res.data.data.actno || actno);
        localStorage.setItem('acct_nm', res.data.data.acct_nm || acctNm);

        alert("계좌 인증이 완료되었습니다.");
        onClose(); // 모달 닫기
        navigate('/select-gear'); // 어구 선택 화면으로 이동
      } else {
        alert("계좌 인증에 실패했습니다. 정보를 다시 확인해주세요.");
      }
    } catch (err) {
      console.error("계좌 인증 에러:", err);
      alert("서버 오류로 계좌 인증에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ padding: '40px', maxWidth: '500px', background: '#fff', borderRadius: '15px' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.8rem', color: '#333' }}>
          환급받을 계좌를 입력해주세요
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>은행: (필수)</label>
          <select value={bankCd} onChange={(e) => setBankCd(e.target.value)} style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '5px' }}>
            <option value="">은행 선택</option>
            {banks.map(b => (
              <option key={b.bank_cd} value={b.bank_cd}>{b.bank_nm}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>예금주명: (필수)</label>
          <input type="text" value={acctNm} onChange={(e) => setAcctNm(e.target.value)} placeholder="예: 홍길동" style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '5px' }} />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>계좌번호: (필수, - 제외)</label>
          <input type="number" value={actno} onChange={(e) => setActno(e.target.value)} placeholder="예: 12345678901" style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '5px' }} />
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={handleVerifyAccount} disabled={isLoading} style={{ flex: 2, padding: '20px', backgroundColor: '#000', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            {isLoading ? '인증 중...' : '계좌 인증'}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '20px', backgroundColor: '#6c757d', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountInputModal;