import os
import nbformat

from nbformat.v4 import new_notebook

def create_project_structure():
    # Base directory
    base_dir = "major_project"
    
    # Subdirectories to create
    directories = [
        "",  # Creates the base dir
        "08_deployment",
        "data",
        "models"
    ]
    
    # Notebooks to create
    notebooks = [
        "00_data_preparation.ipynb",
        "01_feature_engineering.ipynb",
        "02a_layer1_instability_index.ipynb",
        "03_layer2a_econometric.ipynb",
        "04_layer2b_ml_models.ipynb",
        "05_layer3_lstm.ipynb",
        "06_ews_classifier.ipynb",
        "07_model_comparison.ipynb"
    ]
    
    # Standard files to create
    files = {
        "08_deployment/app.py": "# Streamlit or Flask app code goes here\n",
        "08_deployment/requirements.txt": "pandas\nnumpy\nscikit-learn\nstatsmodels\nxgboost\ntensorflow\nshap\n",
        "README.md": "# Major Project\n\nDetailed description of the project structure and execution steps.\n"
    }

    # Data/Models placeholder files (just empty touch)
    placeholders = [
        "data/df_panel_raw.csv",
        "data/df_panel_clean.csv",
        "data/df_panel_final.csv",
        "models/scaler.pkl",
        "models/random_forest.pkl",
        "models/xgboost.pkl",
        "models/lstm_model.h5"
    ]

    # Create directories
    for d in directories:
        dir_path = os.path.join(base_dir, d)
        os.makedirs(dir_path, exist_ok=True)
        
    # Create empty Jupyter Notebooks
    for nb in notebooks:
        nb_path = os.path.join(base_dir, nb)
        if not os.path.exists(nb_path):
            with open(nb_path, "w", encoding="utf-8") as f:
                nbformat.write(new_notebook(), f)
                
    # Create standard files
    for filepath, content in files.items():
        full_path = os.path.join(base_dir, filepath)
        if not os.path.exists(full_path):
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
                
    # Create empty placeholders for data and models
    for p in placeholders:
        full_path = os.path.join(base_dir, p)
        if not os.path.exists(full_path):
            open(full_path, "a").close()

    print(f" Project structure successfully created inside the '{base_dir}' folder!")

if __name__ == "__main__":
    create_project_structure()