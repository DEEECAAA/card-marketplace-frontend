export const msalConfig = {
    auth: {
        clientId: "661de9a1-571c-40a6-bb6b-6ecd545baad4",
        authority: "https://login.microsoftonline.com/common",
        redirectUri: "http://localhost:3000",
        postLogoutRedirectUri: "http://localhost:3000",
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
  };
  
  export const loginRequest = {
    scopes: [
        "openid",
        "profile",
        "email",
        "api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"
    ]
  };