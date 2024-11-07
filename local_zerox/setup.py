from setuptools import setup, find_packages

setup(
    name="zerox",
    version="0.0.1",
    packages=find_packages(),
    install_requires=[
        "litellm>=1.0.0",
        "pillow>=10.1.0",
        "python-dotenv>=1.0.0",
        "aiofiles>=23.2.1"
    ]
)
