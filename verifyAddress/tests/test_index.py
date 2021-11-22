# -*- coding: utf-8 -*-
# Copyright 2021 Jerome Van Der Linden

# Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
# associated documentation files (the "Software"), to deal in the Software without restriction, 
# including without limitation the rights to use, copy, modify, merge, publish, distribute, 
# sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
# furnished to do so.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import responses
import pytest
import os
from unittest import mock, TestCase
from src import index
from importlib import reload

def mockenv(**envvars):
    return mock.patch.dict(os.environ, envvars, clear=True)

class VerifyAddressTest(TestCase):

    @responses.activate
    def test_happy_path(self):
        responses.add(responses.GET, index.ADDRESS_API,
                    json={
                        "features":[
                            {
                                "properties":{
                                    "label":"8 Boulevard du Port 80000 Amiens",
                                    "score":0.89159121588068583
                                }
                            }
                        ]
                    }, status=200)
        result = index.handler({
            "road": "8 Boulevard du Port",
            "postalcode": "80000",
            "city": "Amiens"
        }, None)

        assert result['address'] == "8 Boulevard du Port 80000 Amiens"

    @responses.activate
    def test_low_confidence(self):
        responses.add(responses.GET, index.ADDRESS_API,
                    json={
                        "features":[
                            {
                                "properties":{
                                    "label":"8 Boulevard du Port 80000 Amiens",
                                    "score":0.49159121588068583
                                }
                            }
                        ]
                    }, status=200)
        with pytest.raises(ValueError, match=r"Address is incorrect.*"):
            index.handler({
                "road": "8 Boulevard du Port",
                "postalcode": "80000",
                "city": "Amiens"
            }, None)

    @responses.activate
    def test_no_result(self):
        responses.add(responses.GET, index.ADDRESS_API,
                    json={
                        "features":[]
                    }, status=200)
        with pytest.raises(ValueError, match=r"Address is incorrect.*"):
            index.handler({
                "road": "8 Boulevard du Port",
                "postalcode": "80000",
                "city": "Amiens"
            }, None)


    @responses.activate
    def test_exception(self):
        responses.add(responses.GET, index.ADDRESS_API,
                    body=Exception('Connection Error'))
        with pytest.raises(RuntimeError, match=r"Request Error.*"):
            index.handler({
                "road": "8 Boulevard du Port",
                "postalcode": "80000",
                "city": "Amiens"
            }, None)

    @mockenv(CONFIDENCE_THRESHOLD="0.75")
    @responses.activate
    def test_threshold(self):
        reload(index)
        responses.add(responses.GET, index.ADDRESS_API,
                    json={
                        "features":[
                            {
                                "properties":{
                                    "label":"8 Boulevard du Port 80000 Amiens",
                                    "score":0.76
                                }
                            }
                        ]
                    }, status=200)
        result = index.handler({
            "road": "8 Boulevard du Port",
            "postalcode": "80000",
            "city": "Amiens"
        }, None)

        assert result['address'] == "8 Boulevard du Port 80000 Amiens"