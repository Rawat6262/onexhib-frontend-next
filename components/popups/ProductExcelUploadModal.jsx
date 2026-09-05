"use client";

import React from 'react';
import ExcelUploadModal from '@/components/popups/ExcelUploadModal';
import { uploadProductsExcel } from '@/models/product.model';

const REQUIRED_COLUMNS = ['product_name', 'category', 'details'];

const OPTIONAL_COLUMNS_NOTE =
  'Other columns: price, product_url, product_video_url, unit are optional';

// companyId = the company these products are being bulk-added under.
const ProductExcelUploadModal = ({ isOpen, onClose, onSuccess, companyId }) => (
  <ExcelUploadModal
    isOpen={isOpen}
    onClose={onClose}
    onSuccess={onSuccess}
    title="Upload Products"
    successNoun="products"
    uploadFn={(file, onProgress) => uploadProductsExcel(file, companyId, onProgress)}
    requiredColumns={REQUIRED_COLUMNS}
    optionalColumnsNote={OPTIONAL_COLUMNS_NOTE}
  />
);

export default ProductExcelUploadModal;
