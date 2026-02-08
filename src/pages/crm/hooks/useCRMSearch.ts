import { useState } from "react";
import { usePersistedBranch } from "@/hooks/usePersistedBranch";

export const useCRMSearch = () => {
  const [hasUnsavedChat, setHasUnsavedChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Use persisted branch with automatic normalization and migration
  const { 
    selectedBranch, 
    setSelectedBranch, 
    resetBranch,
    validateAgainstAvailable 
  } = usePersistedBranch('all');
  
  const [selectedClientType, setSelectedClientType] = useState<string>("all");
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());

  return {
    hasUnsavedChat,
    setHasUnsavedChat,
    searchQuery,
    setSearchQuery,
    chatSearchQuery,
    setChatSearchQuery,
    showSearchResults,
    setShowSearchResults,
    globalSearchResults,
    setGlobalSearchResults,
    showFilters,
    setShowFilters,
    selectedBranch,
    setSelectedBranch,
    resetBranch,
    validateAgainstAvailable,
    selectedClientType,
    setSelectedClientType,
    bulkSelectMode,
    setBulkSelectMode,
    selectedChatIds,
    setSelectedChatIds,
  };
};
