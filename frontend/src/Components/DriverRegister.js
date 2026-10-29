import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';  // ✅ Link

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '24px', fontFamily: 'Inter, Arial, sans-serif', background: '#0d1b2a', color: '#e0e0e0', minHeight: '100vh', scrollBehavior: 'smooth' },
  title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#ffffff' },
  form: { display: 'grid', gap: '12px', background: '#1b3b5a', border: '1px solid #223a5a', borderRadius: '16px', padding: '18px', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  input: { flex: 1, minWidth: '200px', padding: '12px 14px', border: '1px solid #223a5a', borderRadius: '12px', background: '#102c44', color: '#e0e0e0', outline: 'none', transition: 'all 0.4s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  textarea: { width: '96%', minHeight: '100px', padding: '12px 14px', border: '1px solid #223a5a', borderRadius: '12px', background: '#102c44', color: '#e0e0e0', outline: 'none', transition: 'all 0.4s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  button: { padding: '12px 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #00bcd4, #2196f3)', color: '#0d1b2a', cursor: 'pointer', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', transition: 'all 0.4s ease', fontWeight: 600 },
  secondary: { background: '#223a5a', color: '#e0e0e0', border: '1px solid #2b4f73' },
  msg: { marginTop: '10px', fontSize: '13px' },
  link: { marginTop: '12px', fontSize: '14px' }
};

const DriverRegister = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';
  const [form, setForm] = useState({ name: '', age: '', email: '', password: '', driverPhoto: '', vehiclePhoto: '', experience: '' });
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState(null);
  const navigate = useNavigate();

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleFile = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await toBase64(file);
    setForm(prev => ({ ...prev, [key]: b64 }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/driver`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register');
      setCreated(data.data);
      setMessage('Registration successful. Redirecting to login...');
      
      setTimeout(() => navigate('/driver/login'), 1500);

    } catch (err) {
      setMessage(err.message);
    }
  };

  const goToApply = () => {
    // Registration does not auto-apply. User is redirected to Login to apply after logging in.
    navigate('/driver/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>Driver Registration</div>
      <form onSubmit={submit} style={styles.form}>
        <div style={styles.row}>
          <input style={styles.input} placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required 
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
          <input style={styles.input} placeholder="Age" type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
        </div>
        <div style={styles.row}>
          <input style={styles.input} placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
          <input style={styles.input} placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
            onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 4px rgba(33,150,243,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)'; }}
          />
        </div>
        <div style={styles.row}>
          <input style={styles.input} type="file" accept="image/*" onChange={e => handleFile(e, 'driverPhoto')} />
          <input style={styles.input} type="file" accept="image/*" onChange={e => handleFile(e, 'vehiclePhoto')} />
        </div>
        <textarea style={styles.textarea} placeholder="Experience..." value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} />
        <div style={styles.row}>
          <button type="submit" style={styles.button}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 30px rgba(33,150,243,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(33,150,243,0.25)'; }}
          >Register</button>
          <button type="button" style={{ ...styles.button, ...styles.secondary }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            onClick={goToApply}
          >Apply for driving</button>
        </div>
      </form>

      {message && <div style={styles.msg}>{message}</div>}
      {created && (
        <div style={styles.msg}>Created driver: {created.name} ({created.email})</div>
      )}

      {/* ✅ link to login */}
      <div style={styles.link}>
        Already have an account? <Link to="/driver/login">Login here</Link>
      </div>
    </div>
  );
};

export default DriverRegister;
