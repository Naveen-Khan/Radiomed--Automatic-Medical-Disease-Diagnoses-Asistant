"""Grad-CAM implementation for DenseNet121 medical classifiers."""
from __future__ import annotations

import numpy as np
import tensorflow as tf
from tensorflow import keras

DEFAULT_TARGET_LAYER = "conv5_block16_concat"


def find_last_concat_layer(model):
    for layer in reversed(model.layers):
        if isinstance(layer, keras.layers.Concatenate):
            return layer.name
    raise ValueError("No Concatenate layer found")


def find_last_conv_layer(model):
    for layer in reversed(model.layers):
        if isinstance(layer, keras.layers.Conv2D):
            return layer.name
    raise ValueError("No Conv2D layer found")


def resolve_target_layer(model, layer_name=None) -> str:
    if layer_name:
        try:
            model.get_layer(layer_name)
            return layer_name
        except ValueError:
            pass
    try:
        model.get_layer(DEFAULT_TARGET_LAYER)
        return DEFAULT_TARGET_LAYER
    except ValueError:
        pass
    try:
        return find_last_concat_layer(model)
    except ValueError:
        return find_last_conv_layer(model)


def gradcam(model, image, class_index, layer_name=None):
    """Compute Grad-CAM heatmap (Selvaraju et al., 2017)."""
    target_layer = resolve_target_layer(model, layer_name)
    grad_model = keras.models.Model(
        inputs=model.inputs,
        outputs=[model.get_layer(target_layer).output, model.output],
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(image)
        if isinstance(predictions, list):
            predictions = predictions[0]
        if len(predictions.shape) == 2:
            loss = predictions[0, class_index]
        else:
            loss = predictions[class_index]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    if len(conv_outputs.shape) == 4:
        conv_first = conv_outputs[0]
    else:
        conv_first = conv_outputs
    heatmap = tf.reduce_sum(conv_first * pooled_grads, axis=-1)
    heatmap = tf.maximum(heatmap, 0)
    return heatmap.numpy() if hasattr(heatmap, "numpy") else np.array(heatmap)
