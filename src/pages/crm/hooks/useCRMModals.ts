import { useState } from "react";

export const useCRMModals = () => {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string>('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [showIndividualLessonsModal, setShowIndividualLessonsModal] = useState(false);
  const [showEducationSubmenu, setShowEducationSubmenu] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showScriptsModal, setShowScriptsModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showWhatsAppSessionsModal, setShowWhatsAppSessionsModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  return {
    openModal,
    setOpenModal,
    showAddTaskModal,
    setShowAddTaskModal,
    showEditTaskModal,
    setShowEditTaskModal,
    editTaskId,
    setEditTaskId,
    showInvoiceModal,
    setShowInvoiceModal,
    showGroupsModal,
    setShowGroupsModal,
    showIndividualLessonsModal,
    setShowIndividualLessonsModal,
    showEducationSubmenu,
    setShowEducationSubmenu,
    showNewChatModal,
    setShowNewChatModal,
    showScriptsModal,
    setShowScriptsModal,
    showDashboardModal,
    setShowDashboardModal,
    showScheduleModal,
    setShowScheduleModal,
    showAddClientModal,
    setShowAddClientModal,
    showAddTeacherModal,
    setShowAddTeacherModal,
    showAddStudentModal,
    setShowAddStudentModal,
    isManualModalOpen,
    setIsManualModalOpen,
    showWhatsAppSessionsModal,
    setShowWhatsAppSessionsModal,
    showAddEmployeeModal,
    setShowAddEmployeeModal,
  };
};
