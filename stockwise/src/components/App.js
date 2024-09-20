import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { Layout, Menu, Tooltip, notification } from 'antd';
import axios from 'axios';
import { DashboardOutlined, HistoryOutlined, ShoppingOutlined, CheckSquareOutlined, DatabaseOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import '@fontsource/open-sans';
import '../App.css';
import Items from './Items';
import Requirements from './Requirements';
import OrderHistory from './OrderHistory';
import Dashboard from './Dashboard';
import UseHistory from './UseHistory';
import AuthForm from './AuthForm';
import { UserProvider, useUser } from './UserContext';
import UserMenu from './UserMenu';
import 'animate.css';

const { Sider, Content, Header } = Layout;

function App() {
  const { currentUser } = useUser();
  const [signedIn, setSignedIn] = useState(false);
  const [selectedKey, setSelectedKey] = useState('1');
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isUserMenuModalVisible, setIsUserMenuModalVisible] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get('http://localhost:4000/items');
        setItemSuggestions(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching items:', error);
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setTimeout(() => setIsVisible(false), 500);
    } else {
      setIsVisible(true);
    }
  }, [signedIn]);

  useEffect(() => {
    const userSignedIn = checkUserSignedIn();
    setSignedIn(userSignedIn);
    const currentPath = window.location.pathname;
    const menuItemKey = getMenuKey(currentPath);
    setSelectedKey(menuItemKey);

    if (!userSignedIn && currentPath !== '/') {
      window.location.href = '/';
    }
  }, []);

  const getMenuKey = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return '1';
      case '/requirements':
        return '2';
      case '/order-history':
        return '3';
      case '/use-history':
        return '4';
      case '/items':
        return '5';
      default:
        return '1';
    }
  };

  const handleSignIn = async () => {
    try {
      localStorage.setItem('signedIn', 'true');
      setSignedIn(true);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignup = (status) => {
    setSignedIn(status);
  };

  const checkUserSignedIn = () => {
    return localStorage.getItem('signedIn') === 'true';
  };

  const handleLogout = async () => {
    let isMounted = true;
    setIsVisible(false);
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
      logoutButton.classList.add('logout-fade-out', 'animate__animated', 'animate__fadeOut');
    }
    setTimeout(async () => {
      if (!isMounted) return;
      try {
        await axios.post('http://localhost:4000/logout');
        localStorage.removeItem('signedIn');
        localStorage.removeItem('user');
        setSignedIn(false);
        notification.success({
          notification: 'Logged Out',
          description: 'You have successfully logged out.',
        });
        window.location.href = '/';
      } catch (error) {
        if (isMounted) {
          console.error('Logout error:', error);
        }
      }
    }, 500);
  
    return () => {
      isMounted = false;
    };
  };  

  const handleMenuItemClick = (key) => {
    setSelectedKey(key);
  };

  const handleSettingsClick = () => {
    setIsUserMenuModalVisible(true);
  };

  const handleUserMenuModalCancel = () => {
    setIsUserMenuModalVisible(false);
  };

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        {signedIn ? (
          <>
            <Sider style={{ position: 'fixed', left: 0, height: '100vh', overflow: 'auto' }}>
              <div style={{
                padding: '16px',
                color: '#505050',
                fontSize: '20px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                position: 'relative'
              }}>
                {currentUser ? `Hi, ${currentUser.userid}!` : 'Hi!'}
                <SettingOutlined
                  className="settings-icon"
                  onClick={() => handleSettingsClick()}
                />
              </div>
              <UserMenu
                isModalVisible={isUserMenuModalVisible}
                handleCancel={handleUserMenuModalCancel}
                handleLogout={handleLogout}
              />
              <Menu mode="inline" selectedKeys={[selectedKey]} style={{ marginTop: '5px' }}>
                <Menu.Item key="1" icon={<Tooltip title="Go to Dashboard"><DashboardOutlined /></Tooltip>} onClick={() => handleMenuItemClick('1')}>
                  <Link to="/dashboard">Dashboard</Link>
                </Menu.Item>
                <Menu.Item key="2" icon={<Tooltip title="View Requirements"><CheckSquareOutlined /></Tooltip>} onClick={() => handleMenuItemClick('2')}>
                  <Link to="/requirements">Requirements</Link>
                </Menu.Item>
                <Menu.Item key="3" icon={<Tooltip title="Check Order History"><HistoryOutlined /></Tooltip>} onClick={() => handleMenuItemClick('3')}>
                  <Link to="/order-history">Order History</Link>
                </Menu.Item>
                <Menu.Item key="4" icon={<Tooltip title="View Use History"><ShoppingOutlined /></Tooltip>} onClick={() => handleMenuItemClick('4')}>
                  <Link to="/use-history">Use History</Link>
                </Menu.Item>
                <Menu.Item key="5" icon={<Tooltip title="Browse Items"><DatabaseOutlined /></Tooltip>} onClick={() => handleMenuItemClick('5')}>
                  <Link to="/items">Items</Link>
                </Menu.Item>
              </Menu>
              <div className="logout-button animate__animated" onClick={handleLogout}>
                <LogoutOutlined style={{ marginRight: '8px' }} />
                Logout
              </div>
            </Sider>
            <Layout style={{ marginLeft: 200, backgroundColor: '#efefef' }}>
              <Content>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="/dashboard" element={<>
                    <h1 style={{ color: '#414141', marginTop: '10px', marginBottom: '20px' }}>Dashboard</h1>
                    <Dashboard itemSuggestions={itemSuggestions} />
                  </>} />
                  <Route path="/requirements" element={<>
                    <h1 style={{ color: '#414141', marginTop: '10px', marginBottom: '20px' }}>Requirements</h1>
                    <Requirements itemSuggestions={itemSuggestions} />
                  </>} />
                  <Route path="/order-history" element={<>
                    <h1 style={{ color: '#414141', marginTop: '10px', marginBottom: '20px' }}>Order History</h1>
                    <OrderHistory itemSuggestions={itemSuggestions} />
                  </>} />
                  <Route path="/use-history" element={<>
                    <h1 style={{ color: '#414141', marginTop: '10px', marginBottom: '20px' }}>Use History</h1>
                    <UseHistory itemSuggestions={itemSuggestions} />
                  </>} />
                  <Route path="/items" element={<>
                    <h1 style={{ color: '#414141', marginTop: '10px', marginBottom: '20px' }}>Items</h1>
                    <Items />
                  </>} />
                </Routes>
              </Content>
            </Layout>
          </>
        ) : (
          <AuthForm onSignIn={handleSignIn} onSignup={handleSignup} />
        )}
      </Layout>
    </Router>
  );
};

export default App;
