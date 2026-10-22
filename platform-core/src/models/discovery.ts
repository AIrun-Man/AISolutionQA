export type DiscoveryStatus = "discovered" | "partial" | "needs-review";

export interface DiscoveredElement {
  id: string;
  name: string;
  visible: boolean;
  enabled: boolean;
}

export interface DiscoveredField extends DiscoveredElement {
  fieldType: "text" | "email" | "password" | "select" | "checkbox" | "radio" | "textarea" | "date" | "number" | "file";
  required: boolean;
  validationIds: string[];
}

export interface DiscoveredForm {
  id: string;
  name: string;
  fields: DiscoveredField[];
  submitButtonId?: string;
}

export interface DiscoveredTable {
  id: string;
  name: string;
  columns: Array<{ id: string; label: string; dataType: string }>;
  paginationSupported: boolean;
}

export interface DiscoveredDialog extends DiscoveredElement {
  title: string;
  dismissButtonIds: string[];
}

export interface DiscoveredValidation {
  id: string;
  targetElementId: string;
  type: "required" | "format" | "length" | "pattern" | "range" | "server" | "custom";
  message: string;
  trigger: "submit" | "change" | "blur";
}

export interface NavigationPath {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  triggerElementId: string;
  conditions: string[];
}

export interface DiscoveredPage {
  id: string;
  title: string;
  route: string;
  status: DiscoveryStatus;
  menus: DiscoveredElement[];
  forms: DiscoveredForm[];
  tables: DiscoveredTable[];
  buttons: DiscoveredElement[];
  validations: DiscoveredValidation[];
  dialogs?: DiscoveredDialog[];
}

export interface DiscoveredUserJourney {
  id: string;
  name: string;
  requirementIds: string[];
  pageIds: string[];
  navigationPathIds: string[];
  outcome: string;
}

export interface DiscoveredWorkflow {
  id: string;
  name: string;
  journeyIds: string[];
}

export interface ApplicationFeatureBranch {
  repository: string;
  branch: string;
  commit: string;
}

export interface ApplicationDiscovery {
  schemaVersion: "1.0.0";
  applicationId: string;
  applicationName: string;
  baseUrl: string;
  pages: DiscoveredPage[];
  navigationPaths: NavigationPath[];
  featureBranch?: ApplicationFeatureBranch;
  requirementIds?: string[];
  workflows?: DiscoveredWorkflow[];
  userJourneys?: DiscoveredUserJourney[];
}

export interface DiscoveredScreenSummary {
  id: string;
  title: string;
  route: string;
  status: DiscoveryStatus;
  pageIds: string[];
}

export interface DiscoveredComponentSummary {
  id: string;
  name: string;
  pageId: string;
  type: "menu" | "form" | "field" | "table" | "table-column" | "button" | "dialog";
  visible: boolean;
  enabled: boolean;
}

export interface ApplicationDiscoveryIntelligence {
  schemaVersion: "1.0.0";
  applicationId: string;
  applicationName: string;
  baseUrl: string;
  requirementIds: string[];
  featureBranch?: ApplicationFeatureBranch;
  uiDiscoveryModel: ApplicationDiscovery;
  navigationModel: { paths: NavigationPath[]; userJourneys: DiscoveredUserJourney[]; workflows: DiscoveredWorkflow[] };
  screenInventory: DiscoveredScreenSummary[];
  componentInventory: DiscoveredComponentSummary[];
}

export function validateDiscovery(discovery: ApplicationDiscovery): string[] {
  const errors: string[] = [];
  const pageIds = new Set(discovery.pages.map((page) => page.id));
  if (pageIds.size !== discovery.pages.length) {
    errors.push("Page identifiers must be unique.");
  }
  for (const path of discovery.navigationPaths) {
    if (!pageIds.has(path.sourcePageId)) {
      errors.push(`Navigation ${path.id} has unknown source page ${path.sourcePageId}.`);
    }
    if (!pageIds.has(path.targetPageId)) {
      errors.push(`Navigation ${path.id} has unknown target page ${path.targetPageId}.`);
    }
  }
  const componentIds = new Set<string>();
  const registerComponent = (id: string): void => {
    if (componentIds.has(id)) errors.push(`Duplicate discovered component identifier: ${id}.`);
    componentIds.add(id);
  };
  for (const page of discovery.pages) {
    for (const menu of page.menus) registerComponent(menu.id);
    for (const form of page.forms) {
      registerComponent(form.id);
      for (const field of form.fields) registerComponent(field.id);
    }
    for (const table of page.tables) {
      registerComponent(table.id);
      for (const column of table.columns) registerComponent(column.id);
    }
    for (const button of page.buttons) registerComponent(button.id);
    for (const dialog of page.dialogs ?? []) {
      registerComponent(dialog.id);
    }
  }
  const navigationIds = new Set(discovery.navigationPaths.map((path) => path.id));
  if (navigationIds.size !== discovery.navigationPaths.length) errors.push("Navigation path identifiers must be unique.");
  const journeyIds = new Set((discovery.userJourneys ?? []).map((journey) => journey.id));
  if (journeyIds.size !== (discovery.userJourneys ?? []).length) errors.push("User journey identifiers must be unique.");
  const knownRequirementIds = new Set(discovery.requirementIds ?? []);
  for (const journey of discovery.userJourneys ?? []) {
    for (const pageId of journey.pageIds) {
      if (!pageIds.has(pageId)) errors.push(`User journey ${journey.id} has unknown page ${pageId}.`);
    }
    for (const pathId of journey.navigationPathIds) {
      if (!navigationIds.has(pathId)) errors.push(`User journey ${journey.id} has unknown navigation path ${pathId}.`);
    }
    for (const requirementId of journey.requirementIds) {
      if (knownRequirementIds.size > 0 && !knownRequirementIds.has(requirementId)) {
        errors.push(`User journey ${journey.id} has unknown requirement ${requirementId}.`);
      }
    }
  }
  const workflowIds = new Set((discovery.workflows ?? []).map((workflow) => workflow.id));
  if (workflowIds.size !== (discovery.workflows ?? []).length) errors.push("Workflow identifiers must be unique.");
  for (const workflow of discovery.workflows ?? []) {
    for (const journeyId of workflow.journeyIds) {
      if (!journeyIds.has(journeyId)) errors.push(`Workflow ${workflow.id} has unknown user journey ${journeyId}.`);
    }
  }
  return errors;
}

export function buildApplicationDiscoveryIntelligence(discovery: ApplicationDiscovery): ApplicationDiscoveryIntelligence {
  const errors = validateDiscovery(discovery);
  if (errors.length > 0) throw new Error(`Cannot build application discovery intelligence: ${errors.join(" ")}`);

  const componentInventory: DiscoveredComponentSummary[] = [];
  for (const page of discovery.pages) {
    for (const menu of page.menus) componentInventory.push({ ...menu, pageId: page.id, type: "menu" });
    for (const form of page.forms) {
      componentInventory.push({ id: form.id, name: form.name, pageId: page.id, type: "form", visible: true, enabled: true });
      for (const field of form.fields) componentInventory.push({ ...field, pageId: page.id, type: "field" });
    }
    for (const table of page.tables) {
      componentInventory.push({ id: table.id, name: table.name, pageId: page.id, type: "table", visible: true, enabled: true });
      for (const column of table.columns) componentInventory.push({
        id: column.id,
        name: column.label,
        pageId: page.id,
        type: "table-column",
        visible: true,
        enabled: true
      });
    }
    for (const button of page.buttons) componentInventory.push({ ...button, pageId: page.id, type: "button" });
    for (const dialog of page.dialogs ?? []) componentInventory.push({ ...dialog, pageId: page.id, type: "dialog" });
  }

  return {
    schemaVersion: "1.0.0",
    applicationId: discovery.applicationId,
    applicationName: discovery.applicationName,
    baseUrl: discovery.baseUrl,
    requirementIds: [...(discovery.requirementIds ?? [])],
    ...(discovery.featureBranch ? { featureBranch: { ...discovery.featureBranch } } : {}),
    uiDiscoveryModel: discovery,
    navigationModel: {
      paths: [...discovery.navigationPaths],
      userJourneys: [...(discovery.userJourneys ?? [])],
      workflows: [...(discovery.workflows ?? [])]
    },
    screenInventory: discovery.pages.map((page) => ({
      id: page.id,
      title: page.title,
      route: page.route,
      status: page.status,
      pageIds: [page.id]
    })),
    componentInventory
  };
}
