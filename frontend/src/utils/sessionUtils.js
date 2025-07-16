export const saveChangesToSession = (metadataChanges, lockChanges) => {
    sessionStorage.setItem("metadataChanges", JSON.stringify(metadataChanges));
    sessionStorage.setItem("lockChanges", JSON.stringify(lockChanges));
  };
  
  export const loadChangesFromSession = () => {
    const metadataRaw = sessionStorage.getItem("metadataChanges");
    const lockRaw = sessionStorage.getItem("lockChanges");
  
    return {
      metadataChanges: metadataRaw ? JSON.parse(metadataRaw) : {},
      lockChanges: lockRaw ? JSON.parse(lockRaw) : {},
    };
  };
  