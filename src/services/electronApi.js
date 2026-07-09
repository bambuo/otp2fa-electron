function getApi() {
  if (!window.api) {
    throw new Error('应用接口不可用');
  }
  return window.api;
}

export const electronApi = {
  listKeys: () => getApi().getKeys(),
  addKey: (name, secret) => getApi().addKey(name, secret),
  removeKey: id => getApi().removeKey(id),
  getCodes: () => getApi().getCodes(),
  getQrCode: id => getApi().getQrCode(id),
  getSecurityStatus: () => getApi().getSecurityStatus(),
  getAvatar: () => getApi().getAvatar(),
  getDockHide: () => getApi().getDockHide(),
  setDockHide: hide => getApi().setDockHide(hide),
  openMainWindow: () => getApi().openMain(),
  openFeedbackIssues: () => getApi().openFeedbackIssues(),
  minimizeWindow: () => getApi().minimize(),
  closeWindow: () => getApi().close(),
};
