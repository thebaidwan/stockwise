import React, { useState } from 'react';
import { Modal, Input, Button, message, Popconfirm } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, WarningOutlined } from '@ant-design/icons';
import { useUser } from './UserContext';
import axios from 'axios';

const UserMenu = ({ isModalVisible, handleCancel, handleLogout }) => {
  const { currentUser, setCurrentUser } = useUser();
  const [newUsername, setNewUsername] = useState(currentUser.userid);
  const [newEmail, setNewEmail] = useState(currentUser.email);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');

  const handleSave = async () => {
    try {
      if (newUsername !== currentUser.userid) {
        const response = await axios.put(`${process.env.REACT_APP_API_URL}/update-username`, { userid: currentUser.userid, newUsername });
        if (response.data.success) {
          setCurrentUser({ ...currentUser, userid: newUsername });
          message.success('Username updated successfully');
        }
      }

      if (newEmail !== currentUser.email) {
        const response = await axios.put(`${process.env.REACT_APP_API_URL}/update-email`, { userid: currentUser.userid, newEmail });
        if (response.data.success) {
          setCurrentUser({ ...currentUser, email: newEmail });
          message.success('Email updated successfully');
        }
      }

      if (newPassword) {
        const response = await axios.put(`${process.env.REACT_APP_API_URL}/change-password`, { userid: currentUser.userid, currentPassword, newPassword });
        if (response.data.message === 'Password changed successfully') {
          message.success('Password updated successfully');
        }
      }

      handleCancel();
    } catch (error) {
      if (error.response) {
        if (error.response.status === 409) {
          const errorMessage = error.response.data.error || 'An error occurred.';
          message.error(errorMessage);
        } else if (error.response.status === 400 && error.response.data.error === 'Incorrect current password') {
          message.error('Wrong current password. Please try again.');
        } else {
          message.error('An error occurred. Please try again.');
        }
      } else {
        message.error('An error occurred. Please try again.');
      }
    }
  };

  const handleDelete = async () => {
    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/delete-account`, { data: { userid: currentUser.userid } });
      if (response.data.message === 'Account deleted successfully') {
        setCurrentUser(null);
        message.success('Account deleted successfully');
        handleLogout();
      }
    } catch (error) {
      message.error('An error occurred. Please try again.');
    }
  };

  const handleBackupAndReset = async () => {
    if (backupPassword !== 'GB') {
      message.error('Incorrect password. Please try again.');
      return;
    }

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/backup-and-reset`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'stockwise_backup.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('Backup downloaded and data reset successfully');
      setBackupModalVisible(false);
      handleCancel();
    } catch (error) {
      message.error('An error occurred during backup and reset. Please try again.');
    }
  };

  return (
    <>
      <Modal
        title="User Settings"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Popconfirm
              title="Are you sure you want to delete your account? This action is irreversible. Past actions will not be deleted to ensure data integrity."
              onConfirm={handleDelete}
              okText="Yes"
              cancelText="No"
              overlayStyle={{ width: '400px' }}
            >
              <Button key="delete" type="primary" danger>
                Delete Account
              </Button>
            </Popconfirm>

            <div>
              <Button key="cancel" onClick={handleCancel} style={{ marginRight: '10px' }}>
                Cancel
              </Button>
              <Button key="save" type="primary" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        ]}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              width: '100%',
              maxWidth: '500px',
            }}
          >
            <Input
              placeholder="Enter new username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              prefix={<UserOutlined />}
              style={{ flex: 1 }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              width: '100%',
              maxWidth: '500px',
            }}
          >
            <Input
              placeholder="Enter new email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              prefix={<MailOutlined />}
              style={{ flex: 1 }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              width: '100%',
              maxWidth: '500px',
            }}
          >
            <Input.Password
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              prefix={<LockOutlined />}
              style={{ flex: 1 }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              width: '100%',
              maxWidth: '500px',
            }}
          >
            <Input.Password
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              prefix={<LockOutlined />}
              style={{ flex: 1 }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '5px',
              width: '100%',
            }}
          >
            <Button
              type="link"
              danger
              onClick={() => setBackupModalVisible(true)}
            >
              Backup and Reset Data
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <>
            <WarningOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
            Backup and Reset Data
          </>
        }
        open={backupModalVisible}
        onCancel={() => setBackupModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setBackupModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" danger onClick={handleBackupAndReset}>
            Confirm Backup and Reset
          </Button>,
        ]}
      >
        <p>
          Warning: This action will create a backup of your current data and then reset the database. Please ensure you save the backup file in a safe location.
        </p>
        <p>This process will:</p>
        <ul>
          <li>Create an Excel backup of items, order histories, requirements, and use histories</li>
          <li>Delete all documents in order histories, use histories, and requirements</li>
          <li>Empty all item histories</li>
          <li>Reset all stocks to zero</li>
        </ul>
        <p>This process will not:</p>
        <ul>
          <li>Delete any items</li>
          <li>Delete any users</li>
        </ul>
        <p>Enter the master password below to confirm this action.</p>
        <Input.Password
          placeholder="Enter password"
          value={backupPassword}
          onChange={(e) => setBackupPassword(e.target.value)}
          style={{ marginBottom: '20px' }}
        />
      </Modal>
    </>
  );

};

export default UserMenu;