import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Input, Button, Alert, Spin, Checkbox, Select } from 'antd';
import { useUser } from './UserContext';
import ForgotPasswordForm from './ForgotPasswordForm';

const { Option } = Select;

const AuthForm = ({ onSignIn, onSignup }) => {
  const [form] = Form.useForm();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { setCurrentUser } = useUser();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const { userid, expiry } = JSON.parse(storedUser);
      if (new Date() < new Date(expiry)) {
        setCurrentUser(userid);
        onSignIn();
      } else {
        localStorage.removeItem('user');
      }
    }
  }, [setCurrentUser, onSignIn]);

  const handleSignIn = async (values) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/signin`, { useridOrEmail: values.useridOrEmail, password: values.password, rememberMe: values.rememberMe });
      if (response.status === 200) {
        const user = { userid: response.data.userid, email: response.data.email };
        setCurrentUser(user);
        if (values.rememberMe) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 7);
          localStorage.setItem('currentUser', JSON.stringify({ ...user, expiry }));
        }
        onSignIn();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (values) => {
    setLoading(true);
    setError('');
    try {
      if (values.password !== values.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/signup`, { userid: values.userid, email: values.email, password: values.password, securityQuestion: values.securityQuestion, securityAnswer: values.securityAnswer });
      if (response.status === 201) {
        onSignup(true);
        window.location.reload();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error) => {
    if (error.response) {
      const errorMessage = error.response.data.error;
      switch (errorMessage) {
        case 'User already exists':
          setError('This Username is already taken. Please choose another one.');
          break;
        case 'User not found':
          setError('Username does not exist.');
          break;
        case 'Incorrect password':
          setError(
            <>
              The password you entered is incorrect.&nbsp;
              <span style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowForgotPassword(true)}>
                Forgot Password?
              </span>
            </>
          );
          break;
        default:
          setError(errorMessage || 'Authentication failed');
      }
    } else {
      setError('Authentication failed');
    }
  };

  const handleTabChange = () => {
    setIsLogin(!isLogin);
    form.resetFields();
    setError('');
  };

  const formStyle = {
    width: '100%',
  };

  const inputStyle = {
    width: '100%',
  };

  const customStyles = `
    .ant-input,
    .ant-input-password,
    .ant-select-selector {
      padding-left: 30px !important;
      padding-right: 30px !important;
    }
    .ant-input-password .ant-input {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    .ant-select-selector {
      height: 32px !important;
    }
    .ant-select-selection-item {
      line-height: 30px !important;
    }
  `;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
      <style>{customStyles}</style>
      {showForgotPassword ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '350px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
          <img src="/logo2.svg" alt="Logo" style={{ width: '20%', marginBottom: '30px' }} />
          <ForgotPasswordForm />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '350px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
          <img src="/logo2.svg" alt="Logo" style={{ width: '20%', marginBottom: '30px' }} />
          {isLogin ? (
            <Form form={form} name="login" onFinish={handleSignIn} key="login-form" style={formStyle}>
              <Form.Item name="useridOrEmail" rules={[{ required: true, message: 'Please input your Username or Email!' }]}>
                <Input placeholder="Username or Email" style={inputStyle} />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: 'Please input your Password!' }]}>
                <Input.Password placeholder="Password" style={inputStyle} />
              </Form.Item>

              <Form.Item name="rememberMe" valuePropName="checked">
                <Checkbox>Remember Me</Checkbox>
              </Form.Item>
              {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '15px' }} />}
              <Form.Item style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <Button type="primary" htmlType="submit" style={{ width: '125px' }} disabled={loading}>
                    {loading ? <Spin /> : 'Sign In'}
                  </Button>
                </div>
              </Form.Item>
            </Form>
          ) : (
            <Form form={form} name="register" onFinish={handleSignUp} key="register-form" style={formStyle}>
              <Form.Item name="userid" rules={[{ required: true, message: 'Please input your Username!' }]}>
                <Input placeholder="Username" style={inputStyle} />
              </Form.Item>
              <Form.Item name="email" rules={[{ required: true, message: 'Please input your Email!' }]}>
                <Input placeholder="Email" style={inputStyle} />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: 'Please input your Password!' }]}>
                <Input.Password placeholder="Password" style={inputStyle} />
              </Form.Item>
              <Form.Item name="confirmPassword" dependencies={['password']} hasFeedback rules={[{ required: true, message: 'Please confirm your password!' }, ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              })]}>
                <Input.Password placeholder="Confirm Password" style={inputStyle} />
              </Form.Item>
              <Form.Item name="securityQuestion" rules={[{ required: true, message: 'Please select a security question!' }]}>
                <Select placeholder="Select a security question" style={inputStyle}>
                  <Option value="firstCar">What make was your first car?</Option>
                  <Option value="firstPet">What was the name of your first pet?</Option>
                  <Option value="birthCity">In what city were you born?</Option>
                </Select>
              </Form.Item>
              <Form.Item name="securityAnswer" rules={[{ required: true, message: 'Please provide an answer to the security question!' }]}>
                <Input placeholder="Answer" style={inputStyle} />
              </Form.Item>
              {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '15px' }} />}
              <Form.Item>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <Button type="primary" htmlType="submit" style={{ width: '125px' }} disabled={loading}>
                    {loading ? <Spin /> : 'Sign Up'}
                  </Button>
                </div>
              </Form.Item>
            </Form>
          )}
          <p>{isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleTabChange}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default AuthForm;