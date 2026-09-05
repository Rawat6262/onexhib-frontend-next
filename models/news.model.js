export const addNews = (formData) =>
  fetch("/api/addnew", {
    method: "POST",
    body: formData,
  });
