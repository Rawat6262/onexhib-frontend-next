"use client";

import React from "react";

import ExcelUploadModal from "@/components/popups/ExcelUploadModal";
import { uploadServicesExcel } from "@/models/service.model";

/**
 * Bulk-upload exhibition service listings from a spreadsheet.
 *
 * Thin by design, exactly like ProductExcelUploadModal and CompanyExcelUploadModal: the
 * shared ExcelUploadModal owns the file picker, the progress bar, the success and error
 * states, so this file is only the column contract and the upload function.
 *
 * NO OWNER ARGUMENT, unlike the product modal, which has to be told which company it is
 * adding to. A service listing belongs to the signed-in provider, and the server reads
 * that from the session — so there is nothing to pass and nothing to pass wrongly.
 *
 * ALL SEVEN COLUMNS ARE REQUIRED, because the schema requires all seven. `image` is
 * absent on purpose: it is a Cloudinary upload with a public_id used to delete the asset
 * later, and a spreadsheet cannot carry one. Imported listings have no image and the
 * provider adds it by editing the listing.
 */

const REQUIRED_COLUMNS = [
  "full_name",
  "service_name",
  "country",
  "state",
  "city",
  "address",
  "mobile_number",
];

/*
 * Two things people get wrong, so both are said up front rather than discovered through
 * a rejection.
 *
 * service_name must match the backend enum EXACTLY, including capitalisation and the
 * spaces in "LED / TV Rental" — the import checks it against the schema and names the bad
 * row rather than letting Mongo refuse the whole batch.
 *
 * Headers themselves are forgiving: "Service Name", "service name" and "service_name"
 * all work, and a column we do not recognise is reported back by name.
 */
const OPTIONAL_COLUMNS_NOTE =
  "All seven columns are required. service_name must be one of: Printing, "
  + "Furniture Rental, LED / TV Rental, Fabrication, Protocol Staff, Catalog Printing, "
  + "Corporate Gifting. Header spelling is flexible — \"Service Name\" and \"service_name\" "
  + "both work. Images cannot be imported; add them by editing a listing afterwards.";

const ServiceExcelUploadModal = ({ isOpen, onClose, onSuccess }) => (
  <ExcelUploadModal
    isOpen={isOpen}
    onClose={onClose}
    onSuccess={onSuccess}
    title="Upload Services"
    successNoun="services"
    uploadFn={(file, onProgress) => uploadServicesExcel(file, onProgress)}
    requiredColumns={REQUIRED_COLUMNS}
    optionalColumnsNote={OPTIONAL_COLUMNS_NOTE}
  />
);

export default ServiceExcelUploadModal;
