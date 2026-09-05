"use client";

import React from 'react';
import ExcelUploadModal from '@/components/popups/ExcelUploadModal';
import { uploadCompaniesExcel } from '@/models/company.model';

const REQUIRED_COLUMNS = [
  'company_name',
  'company_nature',
  'company_phone_number',
  'company_address',
  'pincode',
  'about_company',
];

const OPTIONAL_COLUMNS_NOTE =
  'Other columns: company_email, company_website, stall_no, hall_no are optional';

// exhibitionId = the exhibition these companies are being bulk-added under.
const CompanyExcelUploadModal = ({ isOpen, onClose, onSuccess, exhibitionId }) => (
  <ExcelUploadModal
    isOpen={isOpen}
    onClose={onClose}
    onSuccess={onSuccess}
    title="Upload Companies"
    successNoun="companies"
    uploadFn={(file, onProgress) => uploadCompaniesExcel(file, exhibitionId, onProgress)}
    requiredColumns={REQUIRED_COLUMNS}
    optionalColumnsNote={OPTIONAL_COLUMNS_NOTE}
  />
);

export default CompanyExcelUploadModal;
