"use client";

import React from 'react';
import ExcelUploadModal from '@/components/popups/ExcelUploadModal';
import { uploadExhibitionsExcel } from '@/models/exhibition.model';

const REQUIRED_COLUMNS = [
  'exhibition_name',
  'exhibition_address',
  'category',
  'venue',
  'starting_date (YYYY-MM-DD)',
  'ending_date (YYYY-MM-DD)',
  'exhibtion_url',
  'country',
  'state',
  'city',
  'about_exhibition',
];

const OPTIONAL_COLUMNS_NOTE =
  'Other columns: email, exhibitor_profile, speakers, session, sponsor, ' +
  'privacy_policy, partners, terms_of_service, support, visitor, ' +
  'about_organiser, layout_url are optional';

const ExhibitionUploadModal = ({ isOpen, onClose, onSuccess }) => (
  <ExcelUploadModal
    isOpen={isOpen}
    onClose={onClose}
    onSuccess={onSuccess}
    title="Upload Exhibitions"
    successNoun="exhibitions"
    uploadFn={uploadExhibitionsExcel}
    requiredColumns={REQUIRED_COLUMNS}
    optionalColumnsNote={OPTIONAL_COLUMNS_NOTE}
  />
);

export default ExhibitionUploadModal;
