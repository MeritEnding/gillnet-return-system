// src/mainPage/modals/LoginModal.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !password) {
      alert("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:8080/api/v1/proxy/user/login', {
        id: userId,
        password: password
      });

      // API 명세에 따라 200 이거나 '성공' 메시지일 때 처리
      // API 명세에 따라 200 이거나 '성공' 메시지일 때 처리
      if (response.data.status == 200 || response.data.message.includes("성공")) {
        const userData = response.data.data;
        
        // 1. 회원 기본 정보 저장
        localStorage.setItem('fisherman_id', userData.user_fshnd_no);
        localStorage.setItem('fisherman_name', userData.mbr_nm);
        localStorage.setItem('mbr_no', userData.mbr_no);
        localStorage.setItem('is_member', 'true'); // ★ 회원임을 명확히 저장
        
        // 2. 계좌 정보 저장
        if (userData.actno) {
          localStorage.setItem('bank_cd', userData.bank_cd || '');
          localStorage.setItem('actno', userData.actno);
          localStorage.setItem('acct_nm', userData.dpstr_nm || userData.mbr_nm);
        }

        alert(`${userData.mbr_nm}님 환영합니다!`);
        onClose();
        
        // [수정] 엉뚱한 곳이 아닌 어구 선택 화면으로 이동시킵니다.
        navigate('/select-gear'); 
      } else {
        alert("아이디 또는 비밀번호가 일치하지 않습니다.");
      }
    } catch (error) {
      console.error("로그인 에러:", error);
      alert("로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content auth-choice-modal" style={{ padding: '40px', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title" style={{ marginBottom: '30px' }}>아이디/비밀번호 로그인</h2>
        
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>아이디</label>
            <input 
              type="text" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)} 
              placeholder="아이디를 입력하세요" 
              style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '8px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>비밀번호</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="비밀번호를 입력하세요" 
              style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '8px' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button type="submit" disabled={isLoading} style={{ flex: 2, padding: '20px', backgroundColor: '#007BFF', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '20px', backgroundColor: '#6c757d', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;