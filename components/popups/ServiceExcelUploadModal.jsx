"use client";

import React from "react";

import ExcelUploadModal from "@/components/popups/ExcelUploadModal";
import { uploadServicesExcel } from "@/models/service.model";
// The real taxonomy, so the note below can never name a category the API rejects.
import { SERVICE_CATEGORIES } from "@/lib/service-taxonomy";

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
 * ALL SEVEN REQUIRED COLUMNS ARE REQUIRED, because the schema requires all seven.
 * `image` is absent on purpose: it is a Cloudinary upload with a public_id used to delete
 * the asset later, and a spreadsheet cannot carry one. Imported listings have no image and
 * the provider adds it by editing the listing.
 *
 * service_subcategory IS THE ONE OPTIONAL COLUMN. A sheet without it imports exactly as it
 * always did - the importer only adds the field when a row carries a value - so every
 * spreadsheet a provider already has keeps working unchanged.
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
 * service_name must match the taxonomy EXACTLY, capitalisation and ampersands included
 * ("Printing & Branding", not "Printing and Branding") — the import checks it against the
 * schema and names the bad row rather than letting Mongo refuse the whole batch. The list
 * is built from SERVICE_CATEGORIES below rather than retyped, so this note cannot drift
 * out of step with what the API accepts.
 *
 * The seven PRE-MIGRATION names are also accepted and mapped forward, which is worth
 * saying out loud: a provider holding a sheet built last month would otherwise assume all
 * of it is now invalid.
 *
 * Headers themselves are forgiving: "Service Name", "service name" and "service_name"
 * all work, and a column we do not recognise is reported back by name.
 */
const OPTIONAL_COLUMNS_NOTE =
  "The seven columns above are required. service_subcategory is required on a listing "
  + "but the COLUMN is optional: a sheet without it imports with every row set to "
  + '"General", which providers can narrow later by editing a listing. '
  + "service_name must be one of: " + SERVICE_CATEGORIES.join(", ") + ". "
  + "A subcategory must belong to the category on the same row — the rejection names the "
  + "valid ones for you. The seven old category names (Printing, Fabrication, "
  + "Protocol Staff, LED / TV Rental, Catalog Printing, Corporate Gifting) still import: "
  + "they are mapped to their new categories automatically, so an older sheet needs no "
  + "editing. Header spelling is flexible — \"Service Name\" and \"service_name\" both "
  + "work. Images cannot be imported; add them by editing a listing afterwards.";

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
