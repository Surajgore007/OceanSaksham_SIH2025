import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Appicon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import BottomTabNavigation from '../../components/ui/BottomTabNavigation';
import AuthenticationGuard from '../../components/ui/AuthenticationGuard';
import OfflineStatusIndicator from '../../components/ui/OfflineStatusIndicator';
import AlertComposer from './components/AlertComposer';
import ActiveAlertsPanel from './components/ActiveAlertsPanel';
import AlertHistory from './components/AlertHistory';
import DeliveryChannelStatus from './components/DeliveryChannelStatus';
import GeographicTargeting from './components/GeographicTargeting';

const ConsoleAlerts = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('compose');
  const [user] = useState({
    id: 'USR-001',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@oceansaksham.gov.in',
    role: 'Official',
    department: 'Coastal Emergency Management',
    location: 'Kochi Regional Office'
  });

  const tabs = [
    {
      id: 'compose',
      label: 'Compose Alert',
      icon: 'Megaphone',
      description: 'Create and send new emergency alerts'
    },
    {
      id: 'active',
      label: 'Active Alerts',
      icon: 'Radio',
      description: 'Monitor ongoing alert campaigns'
    },
    {
      id: 'channels',
      label: 'Delivery Status',
      icon: 'Wifi',
      description: 'Check channel health and performance'
    },
    {
      id: 'targeting',
      label: 'Geographic Targeting',
      icon: 'MapPin',
      description: 'Configure alert coverage areas'
    },
    {
      id: 'history',
      label: 'Alert History',
      icon: 'History',
      description: 'Review past alerts and analytics'
    }
  ];

  const handleSendAlert = async (alertData) => {
    console.log('Sending alert:', alertData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Show success notification (would be implemented with toast)
    console.log('Alert sent successfully!');
    
    // Switch to active alerts tab to show the new alert
    setActiveTab('active');
  };

  const handleAreaSelect = (areaData) => {
    console.log('Area selected:', areaData);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'compose':
        return (
          <AlertComposer 
            onSendAlert={handleSendAlert}
            className="h-full"
          />
        );
      case 'active':
        return (
          <ActiveAlertsPanel 
            className="h-full"
          />
        );
      case 'channels':
        return (
          <DeliveryChannelStatus 
            className="h-full"
          />
        );
      case 'targeting':
        return (
          <GeographicTargeting 
            onAreaSelect={handleAreaSelect}
            className="h-full"
          />
        );
      case 'history':
        return (
          <AlertHistory 
            className="h-full"
          />
        );
      default:
        return null;
    }
  };

  return (
    <AuthenticationGuard user={user} requiredRoles={['official']}>
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={handleLogout} />
        
        <main className="pt-16 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Icon name="Megaphone" size={24} className="text-accent" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Console Alerts</h1>
                  <p className="text-muted-foreground">
                    Emergency alert management and multi-channel notifications
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <OfflineStatusIndicator size="sm" />
                <Button
                  variant="outline"
                  size="sm"
                  iconName="HelpCircle"
                  iconPosition="left"
                >
                  Help
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Icon name="Radio" size={20} className="text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Alerts</p>
                    <p className="text-xl font-bold text-foreground">2</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name="Users" size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">People Reached</p>
                    <p className="text-xl font-bold text-foreground">10.8K</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <Icon name="TrendingUp" size={20} className="text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                    <p className="text-xl font-bold text-foreground">98.5%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Icon name="CheckCircle" size={20} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmations</p>
                    <p className="text-xl font-bold text-foreground">2.1K</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-card border border-border rounded-lg mb-6">
              <div className="border-b border-border">
                <nav className="flex overflow-x-auto">
                  {tabs?.map((tab) => (
                    <button
                      key={tab?.id}
                      onClick={() => setActiveTab(tab?.id)}
                      className={`
                        flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap
                        border-b-2 transition-smooth
                        ${activeTab === tab?.id
                          ? 'border-primary text-primary bg-primary/5' :'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }
                      `}
                    >
                      <Icon name={tab?.icon} size={16} />
                      <span>{tab?.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              
              {/* Tab Description */}
              <div className="px-6 py-3 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  {tabs?.find(tab => tab?.id === activeTab)?.description}
                </p>
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[600px]">
              {renderTabContent()}
            </div>
          </div>
        </main>

        <BottomTabNavigation user={user} />
      </div>
    </AuthenticationGuard>
  );
};

export default ConsoleAlerts;
