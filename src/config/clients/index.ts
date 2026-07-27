import { normalizeClientConfig, validateClientConfig, type ClientConfig } from "../client";
import { auntySalaClient } from "./aunty-sala";

const clients = [auntySalaClient].map(normalizeClientConfig);
const configuredClientId = import.meta.env.VITE_CLIENT_ID?.trim();
const hostname = window.location.hostname.toLowerCase();

const hostnameMatches = (client: ClientConfig) => client.domainPairs.some((pair) => {
  const storefrontHostname = new URL(pair.storefront).hostname.toLowerCase();
  const adminHostname = new URL(pair.admin).hostname.toLowerCase();
  return hostname === storefrontHostname || hostname === adminHostname;
});

const selectedClient = (
  clients.find((client) => client.id === configuredClientId)
  ?? clients.find(hostnameMatches)
  ?? clients[0]
);

const environmentStoreOrigin = import.meta.env.VITE_STORE_ORIGIN?.trim();
const environmentAdminOrigin = import.meta.env.VITE_ADMIN_ORIGIN?.trim();
export const clientConfig = normalizeClientConfig(
  environmentStoreOrigin && environmentAdminOrigin
    ? {
        ...selectedClient,
        domainPairs: [
          { storefront: environmentStoreOrigin, admin: environmentAdminOrigin },
          ...selectedClient.domainPairs.filter((pair) => (
            pair.storefront !== environmentStoreOrigin || pair.admin !== environmentAdminOrigin
          )),
        ],
      }
    : selectedClient,
);
validateClientConfig(clientConfig);

export const clientRegistry = clients;
