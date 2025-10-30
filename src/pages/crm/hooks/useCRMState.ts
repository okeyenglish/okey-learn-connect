import { useState } from "react";

export const useCRMState = () => {
  const [activeTab, setActiveTab] = useState<string>("chats");
  const [activePhoneId, setActivePhoneId] = useState<string>('1');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatType, setActiveChatType] = useState<'client' | 'corporate' | 'teachers'>('client');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isPinnedSectionOpen, setIsPinnedSectionOpen] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [activeClientInfo, setActiveClientInfo] = useState<{ name: string; phone: string; comment: string } | null>(null);
  const [activeClientName, setActiveClientName] = useState('');
  const [pinnedTaskClientId, setPinnedTaskClientId] = useState<string>('');
  const [pinnedInvoiceClientId, setPinnedInvoiceClientId] = useState<string>('');
  const [adminActiveSection, setAdminActiveSection] = useState("dashboard");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);

  return {
    activeTab,
    setActiveTab,
    activePhoneId,
    setActivePhoneId,
    activeChatId,
    setActiveChatId,
    activeChatType,
    setActiveChatType,
    selectedTeacherId,
    setSelectedTeacherId,
    isPinnedSectionOpen,
    setIsPinnedSectionOpen,
    showOnlyUnread,
    setShowOnlyUnread,
    activeClientInfo,
    setActiveClientInfo,
    activeClientName,
    setActiveClientName,
    pinnedTaskClientId,
    setPinnedTaskClientId,
    pinnedInvoiceClientId,
    setPinnedInvoiceClientId,
    adminActiveSection,
    setAdminActiveSection,
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    voiceAssistantOpen,
    setVoiceAssistantOpen,
  };
};
