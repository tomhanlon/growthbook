import React from "react";
import Link from "next/link";
import { useDefinitions } from "../../services/DefinitionsContext";
import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import { useState } from "react";
import DataSourceForm from "../Settings/DataSourceForm";
import { useRouter } from "next/router";
import MetricForm from "../Metrics/MetricForm";
import { FaChevronRight, FaDatabase, FaQuestionCircle } from "react-icons/fa";
import Button from "../Button";
import Tooltip from "../Tooltip";
import { useAuth } from "../../services/auth";
import track from "../../services/track";
import { hasFileConfig } from "../../services/env";
import EditDataSourceSettingsForm from "../Settings/EditDataSourceSettingsForm";
import ImportExperimentModal from "../Experiment/ImportExperimentModal";
import GetStartedStep from "./GetStartedStep";
import DocumentationLinksSidebar from "./DocumentationLinksSidebar";
import useOrgSettings from "../../hooks/useOrgSettings";
import { useMemo } from "react";

const ExperimentsGetStarted = ({
  experiments,
  mutate,
}: {
  experiments: ExperimentInterfaceStringDates[];
  mutate: () => void;
}): React.ReactElement => {
  const { metrics, datasources, mutateDefinitions } = useDefinitions();
  const { apiCall } = useAuth();

  const { visualEditorEnabled } = useOrgSettings();

  const [dataSourceOpen, setDataSourceOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [experimentsOpen, setExperimentsOpen] = useState(false);
  const [dataSourceQueriesOpen, setDataSourceQueriesOpen] = useState(false);
  const router = useRouter();

  // If this is coming from a feature experiment rule
  const featureExperiment = useMemo(() => {
    if (!router?.query?.featureExperiment) {
      return null;
    }
    try {
      const initialExperiment: Partial<ExperimentInterfaceStringDates> = JSON.parse(
        router?.query?.featureExperiment as string
      );
      window.history.replaceState(null, null, window.location.pathname);
      return initialExperiment;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [router?.query?.featureExperiment]);

  const hasSampleExperiment = experiments.filter((m) =>
    m.id.match(/^exp_sample/)
  )[0];

  const hasDataSource = datasources.length > 0;
  const hasMetrics =
    metrics.filter((m) => !m.id.match(/^met_sample/)).length > 0;
  const hasExperiments =
    experiments.filter((m) => !m.id.match(/^exp_sample/)).length > 0;
  const currentStep = hasExperiments
    ? 4
    : hasMetrics
    ? 3
    : hasDataSource
    ? 2
    : 1;
  const allowImport = !(hasMetrics || hasExperiments) && !hasFileConfig();

  const importSampleData = (source: string) => async () => {
    const res = await apiCall<{
      experiment: string;
    }>(`/organization/sample-data`, {
      method: "POST",
    });
    await mutateDefinitions();
    await mutate();
    track("Add Sample Data", {
      source,
    });
    await router.push("/experiment/" + res.experiment);
  };

  return (
    <>
      <div>
        {dataSourceQueriesOpen &&
          datasources?.[0] &&
          datasources[0].properties?.hasSettings && (
            <EditDataSourceSettingsForm
              firstTime={true}
              data={datasources[0]}
              onCancel={() => setDataSourceQueriesOpen(false)}
              onSuccess={() => {
                setDataSourceQueriesOpen(false);
                mutateDefinitions();
              }}
              source="onboarding"
            />
          )}
        {dataSourceOpen && (
          <DataSourceForm
            data={{
              name: "My Datasource",
              settings: {},
            }}
            existing={false}
            source="get-started"
            onCancel={() => setDataSourceOpen(false)}
            onSuccess={async () => {
              await mutateDefinitions();
              setDataSourceOpen(false);
              setDataSourceQueriesOpen(true);
            }}
            importSampleData={
              !hasDataSource &&
              allowImport &&
              !hasSampleExperiment &&
              importSampleData("datasource-form")
            }
          />
        )}
        {metricsOpen && (
          <MetricForm
            current={{}}
            edit={false}
            source="get-started"
            onClose={(refresh) => {
              setMetricsOpen(false);
              if (refresh) {
                mutateDefinitions();
              }
            }}
          />
        )}
        {experimentsOpen && (
          <ImportExperimentModal
            onClose={() => setExperimentsOpen(false)}
            source={featureExperiment ? "feature-rule" : "get-started"}
            initialValue={featureExperiment}
          />
        )}
        <div className="row">
          <div className="col-12 col-lg-8">
            {hasFileConfig() ? (
              <div className="alert alert-info">
                It looks like you have a <code>config.yml</code> file. Use that
                to define data sources and metrics.{" "}
                <a href="https://docs.growthbook.io/self-host/config#configyml">
                  View Documentation
                </a>
              </div>
            ) : featureExperiment ? (
              <div className="alert alert-info mb-3">
                First connect to your data source and define a metric. Then you
                can view results for your experiment.
              </div>
            ) : (
              allowImport && (
                <div className="alert alert-info mb-3 d-none d-md-block">
                  <div className="d-flex align-items-center">
                    <strong className="mr-2">Just here to explore?</strong>
                    <div style={{ flex: 1 }}>
                      We have some sample data you can use.
                    </div>
                    {hasSampleExperiment ? (
                      <Link href={`/experiment/${hasSampleExperiment.id}`}>
                        <a className="btn btn-sm btn-link ml-2">
                          View Sample Experiment <FaChevronRight />
                        </a>
                      </Link>
                    ) : (
                      <div>
                        <Button
                          color="info"
                          className="btn-sm ml-3 mr-2"
                          onClick={importSampleData("onboarding")}
                        >
                          <FaDatabase /> Import Sample Data
                        </Button>

                        <Tooltip text="Includes a sample experiment with results. Don't worry, it's easy to remove later.">
                          <FaQuestionCircle className="text-dark" />
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            <div className="row mb-3">
              <div className="col">
                <div className={`card gsbox`} style={{ overflow: "hidden" }}>
                  <GetStartedStep
                    current={currentStep === 1}
                    finished={hasDataSource}
                    image="/images/getstarted-step1.svg"
                    title="1. Connect to your data source(s)"
                    text={
                      <>
                        GrowthBook needs read access to where your experiment
                        and metric data lives. We support Mixpanel, Snowflake,
                        Redshift, BigQuery, Google Analytics, and more. If you
                        don&apos;t see yours,{" "}
                        <a
                          className={``}
                          href="https://www.growthbook.io/contact"
                          target="_blank"
                          rel="noreferrer"
                        >
                          let us know
                        </a>{" "}
                        or{" "}
                        <a
                          href="https://github.com/growthbook/growthbook/issues/new"
                          target="_blank"
                          rel="noreferrer"
                        >
                          open a GitHub issue
                        </a>
                        .
                      </>
                    }
                    hideCTA={hasFileConfig()}
                    cta="Add data source"
                    finishedCTA="View data sources"
                    imageLeft={true}
                    onClick={(finished) => {
                      if (finished) {
                        router.push("/datasources");
                      } else {
                        setDataSourceOpen(true);
                      }
                    }}
                  />
                  <GetStartedStep
                    current={currentStep === 2}
                    finished={hasMetrics}
                    className="border-top"
                    image="/images/getstarted-step2.svg"
                    title="2. Define metrics"
                    text="Create a library of metrics to experiment against. You
                    can always add more at any time, and even add them
                    retroactively to past experiments."
                    hideCTA={hasFileConfig()}
                    cta="Add metric"
                    finishedCTA="View metrics"
                    imageLeft={false}
                    onClick={(finished) => {
                      if (finished) {
                        router.push("/metrics");
                      } else {
                        setMetricsOpen(true);
                      }
                    }}
                  />
                  <GetStartedStep
                    current={currentStep === 3}
                    finished={hasExperiments}
                    className="border-top"
                    image="/images/getstarted-step3.svg"
                    title="3. Add an Experiment"
                    text={
                      featureExperiment
                        ? "Create a new experiment report to analyse the results of your feature."
                        : "Import an existing experiment from your data source or create a new draft from scratch."
                    }
                    hideCTA={false}
                    cta={
                      featureExperiment
                        ? "Add your experiment"
                        : "Add experiment"
                    }
                    finishedCTA="View experiments"
                    imageLeft={true}
                    onClick={(finished) => {
                      if (finished) {
                        router.push("/experiments");
                      } else {
                        setExperimentsOpen(true);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <DocumentationLinksSidebar
              showVisualEditor={!visualEditorEnabled}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ExperimentsGetStarted;
