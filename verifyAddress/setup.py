#!/usr/bin/env python3
from setuptools import find_packages, setup

setup(
    author="Jerome Van Der Linden",
    license="MIT-0",
    name="verifyAddress",
    packages=find_packages(),
    install_requires=["requests"],
    setup_requires=["pytest-runner"],
    test_suite="tests",
    tests_require=["pytest", "pytest-cov", "requests", "responses"],
    version="0.1.2"
)