import { useState } from "react";

export const useCRMSearch = () => {
  const [hasUnsavedChat, setHasUnsavedChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
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
    selectedClientType,
    setSelectedClientType,
    bulkSelectMode,
    setBulkSelectMode,
    selectedChatIds,
    setSelectedChatIds,
  };
};
