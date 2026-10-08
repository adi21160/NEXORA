import { ApiContractIssue } from './types.js';
import { ProjectSpecification } from '../orchestrator/types.js';
import { VirtualProjectFS } from './virtualFS.js';

export class ApiInterfaceMatcher {
  /**
   * Compares client-side API service definitions against specification contracts
   */
  public static checkContracts(
    spec: ProjectSpecification | undefined,
    vfs: VirtualProjectFS
  ): ApiContractIssue[] {
    const issues: ApiContractIssue[] = [];
    if (!spec || !spec.apiContracts || spec.apiContracts.length === 0) {
      return issues;
    }

    const files = vfs.getAllFiles();

    // Look for client-side API files
    const apiFiles = Object.entries(files).filter(
      ([path]) =>
        path.includes('services/api') ||
        path.includes('apiClient') ||
        path.includes('services/store')
    );

    if (apiFiles.length === 0) {
      // If project has API contracts but no API service layer yet, flag recommendation
      return [
        {
          clientPath: 'src/services/apiClient.ts',
          endpoint: spec.apiContracts[0].endpoint,
          method: spec.apiContracts[0].method,
          issue: `Missing client service layer implementing specification contracts (${spec.apiContracts.length} endpoints defined).`,
          expectedContract: `${spec.apiContracts[0].method} ${spec.apiContracts[0].endpoint}`,
        },
      ];
    }

    // Combine contents of api service files
    const apiContent = apiFiles.map(([, f]) => f.content).join('\n');

    for (const contract of spec.apiContracts) {
      const endpointNormalized = contract.endpoint.toLowerCase();
      const method = contract.method.toUpperCase();

      // Check if endpoint is referenced in the API client code
      const hasEndpoint =
        apiContent.toLowerCase().includes(endpointNormalized) ||
        apiContent.includes(contract.endpoint.replace('/api/', ''));

      if (!hasEndpoint) {
        issues.push({
          clientPath: apiFiles[0][0],
          endpoint: contract.endpoint,
          method: contract.method,
          issue: `Endpoint "${contract.endpoint}" (${contract.method}) defined in specification is not referenced or implemented in client services.`,
          expectedContract: `${method} ${contract.endpoint} - ${contract.description}`,
        });
      }
    }

    return issues;
  }
}
