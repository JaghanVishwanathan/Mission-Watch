package com.jaghan.missionwatch;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.data.repository.Repository;
import org.springframework.web.bind.annotation.RestController;

/**
 * Structural rules that keep the codebase maintainable. A failure here means a change crossed a
 * boundary on purpose or by accident; fix the dependency, or update the rule and docs/architecture.md
 * together.
 */
@AnalyzeClasses(packages = "com.jaghan.missionwatch", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    /** Feature packages (launch, provider, snapshot, freshness, ingest…) never depend on each other in a cycle. */
    @ArchTest
    static final ArchRule noCyclesBetweenFeatures =
            slices().matching("com.jaghan.missionwatch.(*)..").should().beFreeOfCycles();

    /** Controllers go through services, so caching, metadata and transactions apply everywhere. */
    @ArchTest
    static final ArchRule controllersDoNotUseRepositories = noClasses()
            .that()
            .areAnnotatedWith(RestController.class)
            .should()
            .dependOnClassesThat()
            .areAssignableTo(Repository.class);

    /** Launch Library 2 types stay inside its adapter; the rest of the app sees only internal models. */
    @ArchTest
    static final ArchRule ll2StaysInItsAdapter = noClasses()
            .that()
            .resideOutsideOfPackage("..ingest.ll2..")
            .should()
            .dependOnClassesThat()
            .resideInAPackage("..ingest.ll2..");

    /** The shared basics never reach into features. */
    @ArchTest
    static final ArchRule commonIsIndependent = noClasses()
            .that()
            .resideInAPackage("..missionwatch.common..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage("..launch..", "..provider..", "..snapshot..", "..freshness..", "..ingest..");
}
