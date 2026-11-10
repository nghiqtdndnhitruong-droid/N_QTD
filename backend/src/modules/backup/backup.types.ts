export interface BackupMetadata {
  version: string;
  system: string;
  exportDate: string;
  totalCollections: number;
  totalRecords: number;
  collectionCounts: Record<string, number>;
}

export interface BackupPayload {
  version: string;
  system: string;
  exportDate: string;
  metadata: BackupMetadata;
  data: {
    users?: any[];
    userProfiles?: any[];
    provinces?: any[];
    communes?: any[];
    hamlets?: any[];
    areaGroups?: any[];
    interestRateConfigs?: any[];
    assetPricingRules?: any[];
    globalWordKeywords?: any[];
    wordTemplates?: any[];
    wordTemplateVersions?: any[];
    wordTemplateMappings?: any[];
    wordExportLogs?: any[];
    members?: any[];
    loans?: any[];
    relatedPersons?: any[];
    collaterals?: any[];
    loanValuations?: any[];
    disbursements?: any[];
    repayments?: any[];
    auditLogs?: any[];
  };
}

export interface RestoreResponse {
  success: boolean;
  message: string;
  restoredAt: string;
  restoredCounts: Record<string, number>;
  totalRecordsRestored: number;
}

