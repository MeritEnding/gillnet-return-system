import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../mainPage/Home.css'; 

const NumberInputScreen = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');

  const handleKeyClick = (key) => {
    if (key === 'BACK') setInputValue(prev => prev.slice(0, -1));
    else if (key === 'CLEAR') setInputValue('');
    else setInputValue(prev => prev + key);
  };

  const handleSubmit = async () => {
    if (!inputValue) return alert('어업인 번호를 입력해주세요.');
    try {
      const response = await axios.post('/api/auth/fisherman/number', { user_fshnd_no: inputValue });
      if (response.data.status === 'SUCCESS') {
        localStorage.setItem('session_token', response.data.session_token);
        localStorage.setItem('fisherman_info', JSON.stringify(response.data.fisherman_info));
        navigate('/certificationPage/scan');
      }
    } catch (e) {
      alert('올바르지 않은 어업인 번호입니다.');
      setInputValue('');
    }
  };

  return (
    <div className="kiosk-wrapper" style={{background:'#F0F4F8'}}>
      <div style={{flex:1, display:'flex', flexDirection:'column', padding:'20px'}}>
        <h2 style={{textAlign:'center', color:'#105E7C'}}>어업인 번호 로그인</h2>
        
        {/* 입력값 표시창 */}
        <div style={{
            background:'white', height:'80px', borderRadius:'15px', 
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'2rem', fontWeight:'bold', border:'3px solid #105E7C', marginBottom:'20px'
        }}>
          {inputValue || <span style={{color:'#ddd', fontSize:'1.5rem'}}>번호를 입력하세요</span>}
        </div>

        {/* 키패드 */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'10px', flex:1}}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
                <KeyBtn key={n} label={n} onClick={()=>handleKeyClick(String(n))} />
            ))}
            <KeyBtn label="T" onClick={()=>handleKeyClick('T')} />
            <KeyBtn label="0" onClick={()=>handleKeyClick('0')} />
            <KeyBtn label="←" onClick={()=>handleKeyClick('BACK')} color="#FFCDD2" />
        </div>

        <div style={{display:'flex', gap:'10px', marginTop:'20px', height:'60px'}}>
            <button onClick={()=>navigate('/')} style={{flex:1, borderRadius:'10px', border:'none', background:'#999', color:'white', fontSize:'1.2rem'}}>취소</button>
            <button onClick={handleSubmit} style={{flex:2, borderRadius:'10px', border:'none', background:'#105E7C', color:'white', fontSize:'1.2rem', fontWeight:'bold'}}>확인</button>
        </div>
      </div>
    </div>
  );
};

const KeyBtn = ({label, onClick, color='white'}) => (
    <button onClick={onClick} style={{
        background:color, border:'none', borderRadius:'10px', fontSize:'1.8rem', fontWeight:'bold',
        boxShadow:'0 4px 0 rgba(0,0,0,0.1)', cursor:'pointer'
    }}>{label}</button>
);

export default NumberInputScreen;