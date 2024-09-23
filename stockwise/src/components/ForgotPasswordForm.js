import React, { useState } from 'react';
import { Form, Input, Button, Alert, Spin, Select } from 'antd';
import axios from 'axios';

const { Option } = Select;

const securityQuestionsMap = {
  firstCar: "What make was your first car?",
  firstPet: "What was the name of your first pet?",
  birthCity: "In what city were you born?"
};

const ForgotPasswordForm = () => {
  const [form] = Form.useForm();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUserIdentification = async (values) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/identify-user`, {
        userIdOrEmail: values.userIdOrEmail,
      });
      setUserData(response.data.user);
      setSecurityQuestion(securityQuestionsMap[response.data.securityQuestion]);
      setStep(2);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to identify user');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityAnswer = async (values) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/verify-security-answer`, {
        userid: userData.userid,
        securityAnswer: values.securityAnswer,
      });
      if (response.status === 200) {
        setStep(3);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Incorrect security answer');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (values) => {
    setLoading(true);
    setError('');
    try {
      if (values.newPassword !== values.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/reset-password`, {
        userid: userData.userid,
        newPassword: values.newPassword,
      });
      if (response.status === 200) {
        setSuccess(true);
        setStep(4);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '350px', padding: '30px' }}>
        <h2 style={{ fontSize: '20px', paddingBottom: '10px' }}>Forgot Password</h2>

        {step === 1 && (
          <Form form={form} onFinish={handleUserIdentification}>
            <Form.Item name="userIdOrEmail" rules={[{ required: true, message: 'Please input your Username or Email!' }]}>
              <Input placeholder="Username or Email" />
            </Form.Item>
            {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '15px' }} />}
            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Button type="primary" htmlType="submit" loading={loading} style={{ width: '150px' }}>
                  {loading ? <Spin /> : 'Next'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        )}

        {step === 2 && (
          <Form form={form} onFinish={handleSecurityAnswer}>
            <p>Please answer the security question:</p>
            <Form.Item>
              <strong>{securityQuestion}</strong>
            </Form.Item>
            <Form.Item name="securityAnswer" rules={[{ required: true, message: 'Please provide your security answer!' }]}>
              <Input placeholder="Security Answer" />
            </Form.Item>
            {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '15px' }} />}
            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Button type="primary" htmlType="submit" loading={loading} style={{ width: '150px' }}>
                  {loading ? <Spin /> : 'Verify'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        )}

        {step === 3 && (
          <Form form={form} onFinish={handleNewPassword}>
            <Form.Item name="newPassword" rules={[{ required: true, message: 'Please input your new password!' }]}>
              <Input.Password placeholder="New Password" />
            </Form.Item>
            <Form.Item name="confirmPassword" dependencies={['newPassword']} hasFeedback rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}>
              <Input.Password placeholder="Confirm New Password" />
            </Form.Item>
            {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '15px' }} />}
            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Button type="primary" htmlType="submit" loading={loading} style={{ width: '150px' }}>
                  {loading ? <Spin /> : 'Reset Password'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        )}

        {step === 4 && success && (
          <div>
            <Alert message="Password reset successful! You can now sign in." type="success" showIcon style={{ marginBottom: '15px' }} />
            <Button type="primary" block onClick={() => window.location.href = '/signin'}>
              Go to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordForm;