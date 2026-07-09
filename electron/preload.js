const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getKeys: () => ipcRenderer.invoke('keys:list'),
  addKey: (name, secret) => ipcRenderer.invoke('keys:add', name, secret),
  removeKey: (id) => ipcRenderer.invoke('keys:remove', id),
  getCodes: () => ipcRenderer.invoke('codes:get'),
  getTopCodes: () => ipcRenderer.invoke('codes:top'),
  getQrCode: (id) => ipcRenderer.invoke('qr:get', id),
  getSecurityStatus: () => ipcRenderer.invoke('security:status'),
  saveAvatar: (dataUrl) => ipcRenderer.invoke('avatar:save', dataUrl),
  getAvatar: () => ipcRenderer.invoke('avatar:get'),
  openMain: () => ipcRenderer.invoke('main:open'),
  minimize: () => ipcRenderer.invoke('win:minimize'),
  close: () => ipcRenderer.invoke('win:close'),
  getDockHide: () => ipcRenderer.invoke('dock:get'),
  setDockHide: (hide) => ipcRenderer.invoke('dock:set', hide),
});
