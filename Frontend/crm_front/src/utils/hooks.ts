import { useContext,useEffect } from "react"
import { ActionTypes,AuthProps,UserType,BranchProps,ServiceTypeProps,DocumentProps,DocumentMappingProps} from "./types"
import { authHandler,getUsers,getBranches,getServiceTypes,getDocuments,getDocumentMappings} from "./functions"
import { store } from "./store"




export const useAuth =async({errorCallBack,successCallBack}:AuthProps)=>{
    const{dispatch}=useContext(store)
    
    useEffect(()=>{
        const checkUser=async () => {
            const user: UserType|null=await authHandler()
            if(!user){
                if(errorCallBack){
                    errorCallBack()
                }
                return
            }
            if(successCallBack){
                dispatch({type:ActionTypes.UPDATE_USER_INFO,payload:user})
                successCallBack()
            }
            
        }
        checkUser()
    },[])
}


export const useGetUsers = (setUsers: (data: any) => void, setFetching: (val: boolean) => void) => {
  useEffect(() => {
    setFetching(true);
    getUsers(setUsers, setFetching);
  }, [setUsers, setFetching]);
};

export const useGetBranches = (setBranches: (data: BranchProps[]) => void, setFetching: (val: boolean) => void) => {
  useEffect(() => {
    setFetching(true);
    getBranches(setBranches, setFetching);
  }, [setBranches, setFetching]);
};

export const useGetServiceTypes = (setServiceTypes: (data: ServiceTypeProps[]) => void, setFetching: (val: boolean) => void) => {
  useEffect(() => {
    setFetching(true);
    getServiceTypes(setServiceTypes, setFetching);
  }, [setServiceTypes, setFetching]);
};

export const useGetDocuments = (setDocuments: (data: DocumentProps[]) => void, setFetching: (val: boolean) => void) => {
  useEffect(() => {
    setFetching(true);
    getDocuments(setDocuments, setFetching);
  }, [setDocuments, setFetching]);
};

export const useGetDocumentMappings = (setMappings: (data: DocumentMappingProps[]) => void, setFetching: (val: boolean) => void) => {
  useEffect(() => {
    setFetching(true);
    getDocumentMappings(setMappings, setFetching);
  }, [setMappings, setFetching]);
};




