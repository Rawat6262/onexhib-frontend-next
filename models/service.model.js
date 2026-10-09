import axios from "axios";

/**
 * PUBLIC. Every provider's listings — this backs the public /exhibition-services page.
 *
 * NOT FOR THE DASHBOARD. It is unscoped by design, so using it there showed every
 * provider every other provider's listings, with Edit and Delete buttons beside rows they
 * do not own. The buttons never worked (the backend pins ownership on both mutations and
 * answers 404 to a stranger), but the rows should not have been there to click.
 */
export const getAdminExhibitionServices = () => axios.get("/api/getexhibitionservice");

/**
 * The SIGNED-IN provider's own listings, for the dashboard.
 *
 * The owner is req.user._id server-side — there is no id in the path or the query, so
 * there is nothing a caller could point at somebody else's listings.
 *
 * Listings created before `createdBy` existed have no owner and so appear here for
 * nobody. That is deliberate: backfilling them would mean guessing, and guessing wrong
 * hands one provider's record to someone else.
 */
export const getMyExhibitionServices = () => axios.get("/api/myexhibitionservices");

/**
 * Bulk-create listings from a spreadsheet.
 *
 * XHR rather than axios, matching the other three importers: upload PROGRESS needs
 * `xhr.upload.onprogress`, which axios does not expose through this codebase's shared
 * instance. The route is relative, so next.config.mjs's rewrite keeps it same-origin and
 * the httpOnly session cookie rides along.
 *
 * NO createdBy FIELD, unlike uploadProductsExcel. The server takes the owner from the
 * session, so there is no owner for this function to pass — and therefore none for a
 * caller to get wrong.
 *
 * The resolved body carries `count`, `skipped`, `rejected` and `unknownHeaders`, so a
 * partial import can be reported row by row instead of as a bare number.
 */
export const uploadServicesExcel = (file, onProgress) =>
  new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      let response = null;
      // A non-JSON body is a failure to report, not a crash: an HTML error page from a
      // proxy would otherwise throw here and surface as "undefined".
      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Upload failed. Please try again."));
        return;
      }
      if (xhr.status === 200 || xhr.status === 201) resolve(response);
      else reject(new Error(response.message || "Upload failed"));
    });

    xhr.addEventListener("error", () => reject(new Error("Network error. Please try again.")));

    xhr.open("POST", "/api/exhibitionservice/upload-excel");
    xhr.send(formData);
  });

export const addExhibitionService = (formData) =>
  axios.post("/api/addexhibitionservice", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getExhibitionServiceById = (serviceId) =>
  axios.get(`/api/getexhibitionservicebyid/${serviceId}`);

export const updateExhibitionService = (serviceId, formData) =>
  axios.put(`/api/editexhibitionservice/${serviceId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteExhibitionService = (serviceId) =>
  axios.delete(`/api/deleteexhibitionservice/${serviceId}`);

/**
 * Contact details for one provider — street address and mobile number.
 *
 * SIGNED IN ONLY. These are the two fields the public directory deliberately
 * withholds: publishing ~500 providers' phone numbers on crawlable pages is what
 * address-harvesters collect, and they are the providers' numbers rather than
 * ours. The page stays public and indexable; this one call sits behind a session.
 *
 * Three projected fields, and the backend cannot return a fourth — see
 * getServiceContact in Controller/exhibitionService.controller.js.
 *
 * Response shape: { success, contact: { name, address, mobile_number } }
 *
 * The id reaches a path segment, so it is encoded here rather than trusting a
 * caller to have validated it.
 */
export const getExhibitionServiceContact = (serviceId) =>
  axios.get(`/api/exhibition-services/${encodeURIComponent(String(serviceId))}/contact`);
