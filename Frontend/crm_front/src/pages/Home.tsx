import { useContext } from "react";
import { store } from "../utils/store";
import Dashboard from "../components/Dashboard";
import { fullname, role, email } from "../utils/data";

function Home(){
  const { state } = useContext(store);
  
  // Get current user info from localStorage
  const currentUser = {
    role: localStorage.getItem(role) || 'user',
    fullname: localStorage.getItem(fullname) || 'User',
    email: localStorage.getItem(email) || ''
  };

  return (
    <Dashboard currentUser={currentUser} />
  );
}

export default Home;