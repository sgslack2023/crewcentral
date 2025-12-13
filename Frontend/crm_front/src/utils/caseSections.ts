/**
 * Utility to determine which form sections to show based on case type and discrimination basis
 */

export type CaseType = 
  | 'Accommodation' 
  | 'Different Treatment' 
  | 'Harassment' 
  | 'Nonselection' 
  | 'Sexual Harassment' 
  | 'Termination';

export type DiscriminationBasis = 
  | 'Age' 
  | 'Color' 
  | 'Mental/Physical Handicap' 
  | 'National Origin' 
  | 'Race' 
  | 'Religion' 
  | 'Reprisal' 
  | 'Sex';

export interface CaseSectionConfig {
  showGeneralInformation: boolean;
  showHandicap: boolean;
  showAccommodation: boolean;
  showAge: boolean;
  showIssues: boolean;
  showLosses: boolean;
  showHarassment: boolean;
  showPositionInformation: boolean;
  showSelecteesInformation: boolean;
  showSexualHarassment: boolean;
  showTermination: boolean;
  showCoworkersInformation: boolean;
  showResponses: boolean;
}

/**
 * Determines which sections to show based on case type and discrimination basis
 */
export const getCaseSections = (
  caseType: CaseType | string | undefined,
  discriminationBasis: DiscriminationBasis | string | undefined
): CaseSectionConfig => {
  // Default: show general information and shared sections
  const config: CaseSectionConfig = {
    showGeneralInformation: true,
    showHandicap: false,
    showAccommodation: false,
    showAge: false,
    showIssues: false,
    showLosses: true, // Shared across all case types
    showHarassment: false,
    showPositionInformation: false,
    showSelecteesInformation: false,
    showSexualHarassment: false,
    showTermination: false,
    showCoworkersInformation: true, // Shared across all case types
    showResponses: true, // Shared across all case types
  };

  // Accommodation - show regardless of basis
  if (caseType === 'Accommodation') {
    config.showAccommodation = true;
    // Show handicap section only if basis is Mental/Physical Handicap
    if (discriminationBasis === 'Mental/Physical Handicap') {
      config.showHandicap = true;
    }
  }

  if (!caseType || !discriminationBasis) {
    return config;
  }

  // Different Treatment + Age
  if (caseType === 'Different Treatment' && discriminationBasis === 'Age') {
    config.showAge = true;
    config.showIssues = true;
  }

  // Different Treatment + other bases
  if (caseType === 'Different Treatment' && discriminationBasis !== 'Age') {
    config.showIssues = true;
  }

  // Harassment
  if (caseType === 'Harassment') {
    config.showHarassment = true;
    config.showIssues = true;
  }

  // Nonselection
  if (caseType === 'Nonselection') {
    config.showPositionInformation = true;
    config.showSelecteesInformation = true;
  }

  // Sexual Harassment + Sex
  if (caseType === 'Sexual Harassment' && discriminationBasis === 'Sex') {
    config.showSexualHarassment = true;
  }

  // Termination
  if (caseType === 'Termination') {
    config.showTermination = true;
  }

  return config;
};

