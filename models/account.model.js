import axios from "axios";

/**
 * "Your profile" (/account/profile): the account and the Community profile,
 * read and saved together. Always the signed-in user's own - the backend takes
 * no user id (Controller/accountProfile.controller.js in Onexhib_backend).
 *
 * Photos are not part of this call; they keep their own upload endpoints
 * (uploadProfileAvatar / uploadProfileCover in social.model.js).
 */
export const getMyProfile = () => axios.get("/api/account/profile");

/** `body` is { account: {...changed account fields}, social: { headline?, bio? } }. */
export const updateMyProfile = (body) => axios.put("/api/account/profile", body);
